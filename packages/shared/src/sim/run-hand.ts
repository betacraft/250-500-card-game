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
import { choosePlay, type PlayView } from '../bot/easy-play';
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

export interface SimReport {
  gameType: GameType;
  hands: number;
  completed: number;
  illegalMoves: number;
  crashes: number;
  deadlocks: number;
  pointMismatches: number;
  scoreMismatches: number;
  cardMismatches: number;
}

/** Play `hands` full Easy-vs-Easy deals. One shared report, no thrown errors. */
export function simulateHands(args: { gameType: GameType; hands: number; seed: number }): SimReport {
  const report = emptyReport(args.gameType, args.hands);
  for (let i = 0; i < args.hands; i += 1) {
    try {
      playOne(args.gameType, mixSeed(args.seed, i), report);
    } catch (error) {
      report.crashes += 1;
      if (report.crashes <= 3) {
        const message = error instanceof Error ? error.message : 'unknown';
        console.error(`sim crash ${args.gameType} hand ${i}: ${message}`);
      }
    }
  }
  return report;
}

function playOne(gameType: GameType, seed: number, report: SimReport): void {
  const rules = rulesFor(gameType);
  const seats = Array.from({ length: rules.PLAYER_COUNT }, (_, i) => `p${i + 1}`);
  const firstBidderId = seats[seed % seats.length] ?? seats[0] ?? 'p1';
  let state = startHand({ gameType, seatOrder: seats, firstBidderId, seed });
  const rng = createRng(seed ^ 0x5eed);
  const history: BidEntry[] = [];
  const auction = () => ({ gameType, playerIds: seats, firstBidderId, bidHistory: history });
  let guard = 0;
  while (!isAuctionClosed(auction()) && guard < seats.length * 4) {
    guard += 1;
    const playerId = nextBidder(auction());
    if (!playerId) break;
    const decision = chooseBid({
      gameType,
      hand: state.hands[playerId] ?? [],
      highBid: currentHigh(history),
      rng,
    });
    if (!pushAuction(auction(), playerId, decision, history, report)) {
      report.deadlocks += 1;
      return;
    }
  }
  const winner = getAuctionWinner(auction());
  if (!winner) {
    report.deadlocks += 1;
    return;
  }
  state = setBidder(state, winner.playerId, winner.amount);
  const bidderHand = state.hands[winner.playerId] ?? [];
  const trump = chooseTrump(bidderHand);
  const called = chooseCalledCards(bidderHand, trump, gameType);
  state = declareTrumpAndPartners(state, trump, called);
  if (!playTricks(state, rng, report)) return;
}

function playTricks(state: GameHand, rng: () => number, report: SimReport): boolean {
  const rules = rulesFor(state.gameType);
  let guard = 0;
  const limit = rules.TOTAL_CARDS + 5;
  while (!state.ended && guard < limit) {
    guard += 1;
    const playerId = state.toPlayerId;
    if (!playerId) {
      report.deadlocks += 1;
      return false;
    }
    const legal = legalPlaysFor(state, playerId);
    if (legal.length === 0) {
      report.deadlocks += 1;
      return false;
    }
    const card = choosePlay(legal, playView(state, playerId, rng));
    const played = playCard(state, playerId, card);
    if (!played.ok) {
      report.illegalMoves += 1;
      report.deadlocks += 1;
      return false;
    }
    state = played.state;
  }
  if (!state.ended) {
    report.deadlocks += 1;
    return false;
  }
  checkFinished(state, report);
  report.completed += 1;
  return true;
}

function checkFinished(state: GameHand, report: SimReport): void {
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
  const bidderDelta = sign * (state.bidAmount + rules.BIDDER_BONUS);
  if (fin.scoreDeltas[state.bidder] !== bidderDelta || fin.bidMade !== (fin.pointsCollected >= state.bidAmount)) {
    report.scoreMismatches += 1;
    return;
  }
  for (const id of state.seatOrder) {
    if (fin.scoreDeltas[id] !== expected.deltas[id]) {
      report.scoreMismatches += 1;
      return;
    }
  }
}

function pushAuction(
  auction: { gameType: GameType; playerIds: readonly string[]; firstBidderId: string; bidHistory: readonly BidEntry[] },
  playerId: string,
  decision: { action: 'bid' | 'pass'; amount?: number },
  history: BidEntry[],
  report: SimReport,
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

function playView(state: GameHand, selfId: string, rng: () => number): PlayView {
  const team = new Set([state.bidder ?? '', ...state.partners]);
  let teamPoints = 0;
  for (const id of team) {
    for (const card of state.collected[id] ?? []) {
      if (card.rank === 'A' || card.rank === 'K' || card.rank === 'Q' || card.rank === 'J' || card.rank === '10') teamPoints += 10;
      else if (card.rank === '5') teamPoints += 5;
    }
  }
  if (state.premiumWinner.spades && team.has(state.premiumWinner.spades)) teamPoints += 30;
  if (state.gameType === '500' && state.premiumWinner.hearts && team.has(state.premiumWinner.hearts)) teamPoints += 30;
  return {
    gameType: state.gameType,
    selfId,
    bidderId: state.bidder ?? selfId,
    trump: state.trump ?? 'spades',
    slots: state.slots,
    partners: [...state.partners],
    seatOrder: state.seatOrder,
    currentTrick: state.currentTrick,
    trickCount: state.trickCount,
    cardsPerPlayer: rulesFor(state.gameType).CARDS_PER_PLAYER,
    teamPoints,
    bidAmount: state.bidAmount ?? 0,
    premiumAwarded: {
      spades: state.premiumWinner.spades !== null,
      hearts: state.premiumWinner.hearts !== null,
    },
    rng,
  };
}

function currentHigh(history: readonly BidEntry[]): number | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry?.action === 'bid' && typeof entry.amount === 'number') return entry.amount;
  }
  return null;
}

function uniqueIds(state: GameHand): boolean {
  const ids: string[] = [];
  const push = (cards: readonly { id?: string }[]): void => {
    for (const card of cards) if (card.id) ids.push(card.id);
  };
  for (const id of state.seatOrder) {
    push(state.hands[id] ?? []);
    push(state.collected[id] ?? []);
  }
  push(state.currentTrick.map((play) => play.card));
  return new Set(ids).size === ids.length && ids.length === rulesFor(state.gameType).TOTAL_CARDS;
}

function mixSeed(seed: number, index: number): number {
  const mixed = Math.imul(seed ^ (index + 1), 0x9e3779b1) >>> 0;
  return mixed === 0 ? 1 : mixed;
}

function emptyReport(gameType: GameType, hands: number): SimReport {
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
  };
}
