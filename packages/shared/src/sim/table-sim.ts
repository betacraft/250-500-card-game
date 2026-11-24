import { createRng } from '../cards/deck';
import {
  getAuctionWinner,
  isAuctionClosed,
  nextBidder,
  validateBid,
  validatePass,
} from '../bidding/state-machine';
import type { BidEntry } from '../state/scorekeeper';
import { chooseBid, chooseCalledCards, chooseTrump } from '../bot/easy-bid';
import { choosePlay } from '../bot/easy-play';
import { chooseNormalBid, chooseNormalDeclaration } from '../bot/normal-bid';
import { chooseNormalPlay } from '../bot/normal-play';
import { toPublicView } from '../bot/public-view';
import {
  declareTrumpAndPartners,
  finalizeHand,
  legalPlaysFor,
  physicalCardCount,
  playCard,
  playedPointTotal,
  setBidder,
  startHand,
  type GameHand,
} from '../engine/hand';
import { rulesFor } from '../games';
import type { GameType } from '../games/types';
import { scoreHand } from '../scoring/score-hand';

export type SeatDifficulty = 'easy' | 'normal';

export interface TableReport {
  gameType: GameType;
  hands: number;
  completed: number;
  illegalMoves: number;
  crashes: number;
  deadlocks: number;
  pointMismatches: number;
  scoreMismatches: number;
  cardMismatches: number;
  auctionsWithBid: number;
  winningBidSum: number;
  madeHands: number;
  normalBidHands: number;
  normalBidMade: number;
  normalWinningBidSum: number;
  easyBidHands: number;
  easyBidMade: number;
  easyWinningBidSum: number;
  normalScoreSum: number;
  easyScoreSum: number;
  normalSeatSamples: number;
  easySeatSamples: number;
  /** Auction turns where that bot was asked to bid or pass. */
  normalAuctionTurns: number;
  normalRealBids: number;
  easyAuctionTurns: number;
  easyRealBids: number;
  moveSamples: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  bidSamples: number;
  bidP50Ms: number;
  bidP95Ms: number;
  searchSamples: number;
  searchP50Ms: number;
  searchP95Ms: number;
  /** Normal mean score minus Easy mean score, one number per mixed hand. */
  marginSamples: number[];
}

/** One table. `botFor` picks Easy or Normal per seat. Latencies are Normal card-play times. */
export function simulateTable(args: {
  gameType: GameType;
  hands: number;
  seed: number;
  from?: number;
  botFor: (seatIndex: number, handIndex: number) => SeatDifficulty;
  latencies?: number[];
}): TableReport {
  const report = emptyTable(args.gameType, args.hands);
  const latencies = args.latencies ?? [];
  const bids: number[] = [];
  const searches: number[] = [];
  const started = Date.now();
  const from = args.from ?? 0;
  for (let n = 0; n < args.hands; n += 1) {
    const i = from + n;
    try {
      playOne(args.gameType, mixSeed(args.seed, i), i, args.botFor, report, latencies, bids, searches);
    } catch (error) {
      report.crashes += 1;
      if (report.crashes <= 3) console.error(`table crash ${args.gameType} ${i}: ${error instanceof Error ? error.message : 'unknown'}`);
    }
    if ((i + 1) % 100 === 0) {
      console.info(JSON.stringify({ gameType: args.gameType, hand: i + 1, seconds: (Date.now() - started) / 1000 }));
    }
  }
  const sorted = latencies.slice().sort((a, b) => a - b);
  const sortedBids = bids.slice().sort((a, b) => a - b);
  const sortedSearch = searches.slice().sort((a, b) => a - b);
  report.moveSamples = sorted.length;
  report.latencyP50Ms = percentile(sorted, 0.5);
  report.latencyP95Ms = percentile(sorted, 0.95);
  report.bidSamples = sortedBids.length;
  report.bidP50Ms = percentile(sortedBids, 0.5);
  report.bidP95Ms = percentile(sortedBids, 0.95);
  report.searchSamples = sortedSearch.length;
  report.searchP50Ms = percentile(sortedSearch, 0.5);
  report.searchP95Ms = percentile(sortedSearch, 0.95);
  return report;
}

function playOne(
  gameType: GameType,
  seed: number,
  handIndex: number,
  botFor: (seatIndex: number, handIndex: number) => SeatDifficulty,
  report: TableReport,
  latencies: number[],
  bids: number[],
  searches: number[],
): void {
  const rules = rulesFor(gameType);
  const seats = Array.from({ length: rules.PLAYER_COUNT }, (_, i) => `p${i + 1}`);
  const kinds = seats.map((_, index) => botFor(index, handIndex));
  const firstBidderId = seats[seed % seats.length] ?? 'p1';
  let state = startHand({ gameType, seatOrder: seats, firstBidderId, seed });
  const rng = createRng(seed ^ 0x5eed);
  const history: BidEntry[] = [];
  const auction = () => ({ gameType, playerIds: seats, firstBidderId, bidHistory: history });
  let guard = 0;
  while (!isAuctionClosed(auction()) && guard < seats.length * 4) {
    guard += 1;
    const playerId = nextBidder(auction());
    if (!playerId) break;
    const seat = seats.indexOf(playerId);
    const hand = state.hands[playerId] ?? [];
    const highBid = currentHigh(history);
    const bidStarted = performance.now();
    const decision = kinds[seat] === 'normal'
      ? chooseNormalBid({ gameType, hand, highBid, rng })
      : chooseBid({ gameType, hand, highBid, rng });
    if (kinds[seat] === 'normal') bids.push(performance.now() - bidStarted);
    const before = history.length;
    if (!pushAuction(auction(), playerId, decision, history, report)) {
      report.deadlocks += 1;
      return;
    }
    const acted = history.length > before ? history[history.length - 1] : undefined;
    if (acted) noteAuctionAct(report, kinds[seat] === 'normal', acted.action === 'bid');
  }
  const winner = getAuctionWinner(auction());
  if (!winner) {
    report.deadlocks += 1;
    return;
  }
  report.auctionsWithBid += history.some((entry) => entry.action === 'bid') ? 1 : 0;
  report.winningBidSum += winner.amount;
  const bidderSeat = seats.indexOf(winner.playerId);
  state = setBidder(state, winner.playerId, winner.amount);
  const bidderHand = state.hands[winner.playerId] ?? [];
  const declareStarted = performance.now();
  const trump = chooseTrump(bidderHand);
  const declared = kinds[bidderSeat] === 'normal'
    ? chooseNormalDeclaration(bidderHand, gameType)
    : { trump, called: chooseCalledCards(bidderHand, trump, gameType) };
  if (kinds[bidderSeat] === 'normal') bids.push(performance.now() - declareStarted);
  state = declareTrumpAndPartners(state, declared.trump, declared.called);
  const finished = playTricks(state, rng, report, kinds, latencies, searches);
  if (!finished) return;
  scoreSeats(finished, report, kinds, bidderSeat);
}

function playTricks(
  state: GameHand,
  rng: () => number,
  report: TableReport,
  kinds: SeatDifficulty[],
  latencies: number[],
  searches: number[],
): GameHand | null {
  const rules = rulesFor(state.gameType);
  let guard = 0;
  while (!state.ended && guard < rules.TOTAL_CARDS + 5) {
    guard += 1;
    const playerId = state.toPlayerId;
    if (!playerId) {
      report.deadlocks += 1;
      return null;
    }
    const legal = legalPlaysFor(state, playerId);
    const first = legal[0];
    if (!first) {
      report.deadlocks += 1;
      return null;
    }
    const seat = state.seatOrder.indexOf(playerId);
    const card = kinds[seat] === 'normal'
      ? timedPlay(state, playerId, legal, rng, latencies, searches)
      : choosePlay(legal, { ...toPublicView(state, playerId), rng });
    if (!legal.some((held) => held.id === card.id)) {
      report.illegalMoves += 1;
      report.deadlocks += 1;
      return null;
    }
    const played = playCard(state, playerId, card);
    if (!played.ok) {
      report.illegalMoves += 1;
      report.deadlocks += 1;
      return null;
    }
    state = played.state;
  }
  if (!state.ended) {
    report.deadlocks += 1;
    return null;
  }
  return state;
}

function timedPlay(
  state: GameHand,
  playerId: string,
  legal: readonly import('../cards/types').Card[],
  rng: () => number,
  latencies: number[],
  searches: number[],
): import('../cards/types').Card {
  const started = performance.now();
  const card = chooseNormalPlay({ view: toPublicView(state, playerId), legal, rng });
  const elapsed = performance.now() - started;
  latencies.push(elapsed);
  if (legal.length > 1) searches.push(elapsed);
  return card;
}

function scoreSeats(state: GameHand, report: TableReport, kinds: SeatDifficulty[], bidderSeat: number): void {
  const rules = rulesFor(state.gameType);
  if (physicalCardCount(state) !== rules.TOTAL_CARDS || !uniqueIds(state)) report.cardMismatches += 1;
  if (playedPointTotal(state) !== rules.TOTAL_POINTS) report.pointMismatches += 1;
  if (!state.bidder || state.bidAmount === null) {
    report.scoreMismatches += 1;
    return;
  }
  const fin = finalizeHand(state);
  const expected = scoreHand({
    gameType: state.gameType,
    allPlayerIds: state.seatOrder,
    bidder: state.bidder,
    bidAmount: state.bidAmount,
    partners: fin.partners,
    bidMade: fin.pointsCollected >= state.bidAmount,
  });
  const sign = fin.bidMade ? 1 : -1;
  if (fin.scoreDeltas[state.bidder] !== sign * (state.bidAmount + rules.BIDDER_BONUS)) report.scoreMismatches += 1;
  for (const id of state.seatOrder) {
    if (fin.scoreDeltas[id] !== expected.deltas[id]) {
      report.scoreMismatches += 1;
      report.completed += 1;
      return;
    }
  }
  if (fin.bidMade) report.madeHands += 1;
  const normalBid = kinds[bidderSeat] === 'normal';
  if (normalBid) {
    report.normalBidHands += 1;
    report.normalWinningBidSum += state.bidAmount;
    if (fin.bidMade) report.normalBidMade += 1;
  } else {
    report.easyBidHands += 1;
    report.easyWinningBidSum += state.bidAmount;
    if (fin.bidMade) report.easyBidMade += 1;
  }
  const normalDeltas: number[] = [];
  const easyDeltas: number[] = [];
  state.seatOrder.forEach((id, index) => {
    const delta = fin.scoreDeltas[id] ?? 0;
    if (kinds[index] === 'normal') {
      report.normalScoreSum += delta;
      report.normalSeatSamples += 1;
      normalDeltas.push(delta);
    } else {
      report.easyScoreSum += delta;
      report.easySeatSamples += 1;
      easyDeltas.push(delta);
    }
  });
  if (normalDeltas.length > 0 && easyDeltas.length > 0) {
    const normalMean = normalDeltas.reduce((sum, value) => sum + value, 0) / normalDeltas.length;
    const easyMean = easyDeltas.reduce((sum, value) => sum + value, 0) / easyDeltas.length;
    report.marginSamples.push(normalMean - easyMean);
  }
  report.completed += 1;
}

function uniqueIds(state: GameHand): boolean {
  const ids: string[] = [];
  for (const id of state.seatOrder) {
    for (const card of state.hands[id] ?? []) if (card.id) ids.push(card.id);
    for (const card of state.collected[id] ?? []) if (card.id) ids.push(card.id);
  }
  for (const play of state.currentTrick) if (play.card.id) ids.push(play.card.id);
  return new Set(ids).size === ids.length && ids.length === rulesFor(state.gameType).TOTAL_CARDS;
}

function pushAuction(
  auction: { gameType: GameType; playerIds: readonly string[]; firstBidderId: string; bidHistory: readonly BidEntry[] },
  playerId: string,
  decision: { action: 'bid' | 'pass'; amount?: number },
  history: BidEntry[],
  report: TableReport,
): boolean {
  if (decision.action === 'bid' && typeof decision.amount === 'number' && validateBid(auction, playerId, decision.amount).ok) {
    history.push({ playerId, action: 'bid', amount: decision.amount });
    return true;
  }
  if (decision.action === 'bid') report.illegalMoves += 1;
  if (!validatePass(auction, playerId).ok) return false;
  history.push({ playerId, action: 'pass' });
  return true;
}

function noteAuctionAct(report: TableReport, normal: boolean, bid: boolean): void {
  if (normal) {
    report.normalAuctionTurns += 1;
    if (bid) report.normalRealBids += 1;
  } else {
    report.easyAuctionTurns += 1;
    if (bid) report.easyRealBids += 1;
  }
}

function currentHigh(history: readonly BidEntry[]): number | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry?.action === 'bid' && typeof entry.amount === 'number') return entry.amount;
  }
  return null;
}

function mixSeed(seed: number, index: number): number {
  const mixed = Math.imul(seed ^ (index + 1), 0x9e3779b1) >>> 0;
  return mixed === 0 ? 1 : mixed;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index] ?? 0;
}

function emptyTable(gameType: GameType, hands: number): TableReport {
  return {
    gameType,
    hands,
    completed: 0,
    illegalMoves: 0,
    crashes: 0,
    deadlocks: 0,
    pointMismatches: 0,
    scoreMismatches: 0,
    cardMismatches: 0,
    auctionsWithBid: 0,
    winningBidSum: 0,
    madeHands: 0,
    normalBidHands: 0,
    normalBidMade: 0,
    normalWinningBidSum: 0,
    easyBidHands: 0,
    easyBidMade: 0,
    easyWinningBidSum: 0,
    normalScoreSum: 0,
    easyScoreSum: 0,
    normalSeatSamples: 0,
    easySeatSamples: 0,
    normalAuctionTurns: 0,
    normalRealBids: 0,
    easyAuctionTurns: 0,
    easyRealBids: 0,
    moveSamples: 0,
    latencyP50Ms: 0,
    latencyP95Ms: 0,
    bidSamples: 0,
    bidP50Ms: 0,
    bidP95Ms: 0,
    searchSamples: 0,
    searchP50Ms: 0,
    searchP95Ms: 0,
    marginSamples: [],
  };
}

/** Mean and 95% CI of a sample. */
export function meanCi(samples: readonly number[]): { mean: number; low: number; high: number } {
  const n = samples.length;
  if (n === 0) return { mean: 0, low: 0, high: 0 };
  const mean = samples.reduce((sum, value) => sum + value, 0) / n;
  const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, n - 1);
  const margin = 1.96 * Math.sqrt(variance / n);
  return { mean, low: mean - margin, high: mean + margin };
}
