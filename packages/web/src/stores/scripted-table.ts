import {
  cardId,
  currentHighBid,
  declareTrumpAndPartners,
  finalizeHand,
  legalPlaysFor,
  playCard,
  rulesFor,
  setBidder,
  startHand,
  type BidEntry,
  type Card,
  type GameHand,
  type GameType,
} from '@250-500/shared';
import { currentTarget, localNames, localSeatIds } from '../analytics/local-target';

const HUMAN_ID = 'p1';

export type DevScript = 'long' | 'over' | 'trick' | 'reveal';

/** Dev-only `?script=` values. Production builds never read the query. */
export function devScript(): DevScript | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  try {
    const value = new URLSearchParams(window.location.search).get('script');
    if (value === 'long' || value === 'over' || value === 'trick' || value === 'reveal') return value;
  } catch {
    /* ignore a blocked location */
  }
  return null;
}

/**
 * While `?script=long` is set, bots bid the next legal step until the
 * auction is long, then pass. Returns null for a normal game.
 */
export function forcedAuctionAction(
  gameType: GameType,
  history: readonly BidEntry[],
): { action: 'bid'; amount: number } | { action: 'pass' } | null {
  if (devScript() !== 'long') return null;
  const rules = rulesFor(gameType);
  const high = currentHighBid(history)?.amount ?? null;
  const amount = high === null ? rules.MIN_BID : high + rules.BID_INCREMENT;
  if (history.length < 11 && amount <= rules.MAX_BID) return { action: 'bid', amount };
  return { action: 'pass' };
}

export interface ScriptedTable {
  phase: 'playing' | 'scored';
  gameType: GameType;
  humanName: string;
  seatOrder: string[];
  names: Record<string, string>;
  hand: GameHand;
  bidHistory: BidEntry[];
  firstBidderId: string;
  runningScores: Record<string, number>;
  handsPlayed: number;
  seed: number;
  decision: number;
  summary: {
    bidMade: boolean;
    pointsCollected: number;
    partners: string[];
    bidAmount: number;
    bidder: string;
    scoreDeltas: Record<string, number>;
  } | null;
  settledTrick: null;
  targetScore: number;
  gameOver: boolean;
}

/** A scored game or a mid-trick table. Null unless `?script=over` or `?script=trick`. */
export function scriptedOpening(gameType: GameType, humanName: string): ScriptedTable | null {
  const script = devScript();
  if (script !== 'over' && script !== 'trick' && script !== 'reveal') return null;
  const seats = localSeatIds(rulesFor(gameType).PLAYER_COUNT);
  const name = humanName.trim() || 'You';
  const bidder = seats[1] ?? HUMAN_ID;
  let hand = startHand({ gameType, seatOrder: seats, firstBidderId: bidder, seed: 7 });
  const rules = rulesFor(gameType);
  hand = setBidder(hand, bidder, rules.MIN_BID);
  hand = declareTrumpAndPartners(hand, 'hearts', calledFromOthers(hand, bidder, rules.PARTNERS_TO_CALL));
  if (script === 'reveal') hand = playCalledCard(hand);
  if (script === 'trick' || script === 'reveal') {
    if (script === 'trick') hand = playUntilHuman(hand);
    return {
      phase: 'playing',
      gameType,
      humanName: name,
      seatOrder: seats,
      names: localNames(seats, HUMAN_ID, name),
      hand,
      bidHistory: [],
      firstBidderId: bidder,
      runningScores: Object.fromEntries(seats.map((id) => [id, 0])),
      handsPlayed: 0,
      seed: 7,
      decision: 0,
      summary: null,
      settledTrick: null,
      targetScore: currentTarget(),
      gameOver: false,
    };
  }
  const scored = scoreForBidder(hand, bidder, seats);
  const fin = scored.fin;
  const runningScores = Object.fromEntries(seats.map((id) => [id, fin.scoreDeltas[id] ?? 0]));
  const targetScore = currentTarget();
  const gameOver = Object.values(runningScores).some((score) => score >= targetScore);
  return {
    phase: 'scored',
    gameType,
    humanName: name,
    seatOrder: seats,
    names: localNames(seats, HUMAN_ID, name),
    hand: scored.hand,
    bidHistory: [],
    firstBidderId: bidder,
    runningScores,
    handsPlayed: 1,
    seed: 7,
    decision: 0,
    summary: {
      bidMade: fin.bidMade,
      pointsCollected: fin.pointsCollected,
      partners: fin.partners,
      bidAmount: rules.MIN_BID,
      bidder,
      scoreDeltas: fin.scoreDeltas,
    },
    settledTrick: null,
    targetScore,
    gameOver,
  };
}

function calledFromOthers(hand: GameHand, bidder: string, count: number): Card[] {
  const found: Card[] = [];
  const seen = new Set<string>();
  for (const id of hand.seatOrder) {
    if (id === bidder) continue;
    for (const card of hand.hands[id] ?? []) {
      const key = cardId(card);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(card);
      if (found.length === count) return found;
    }
  }
  return found;
}

function playCalledCard(hand: GameHand): GameHand {
  if (!hand.bidder) return hand;
  for (const called of hand.calledCards) {
    const face = cardId(called);
    for (const seat of hand.seatOrder) {
      if (seat === hand.bidder) continue;
      const card = (hand.hands[seat] ?? []).find((item) => cardId(item) === face);
      if (!card) continue;
      const result = playCard({ ...hand, toPlayerId: seat, currentTrick: [] }, seat, card);
      if (result.ok) return result.state;
    }
  }
  return hand;
}

function playUntilHuman(hand: GameHand): GameHand {
  let state = hand;
  for (let guard = 0; guard < 20 && state.toPlayerId && state.toPlayerId !== HUMAN_ID && !state.ended; guard += 1) {
    const actor = state.toPlayerId;
    const card = legalPlaysFor(state, actor)[0];
    if (!card) break;
    const result = playCard(state, actor, card);
    if (!result.ok) break;
    state = result.state;
    if (result.trickWinnerId) break;
  }
  return state;
}

function scoreForBidder(hand: GameHand, bidder: string, seats: readonly string[]): { hand: GameHand; fin: ReturnType<typeof finalizeHand> } {
  const pile: Card[] = [];
  const hands: Record<string, Card[]> = {};
  for (const id of seats) {
    pile.push(...(hand.hands[id] ?? []));
    hands[id] = [];
  }
  const scored: GameHand = {
    ...hand,
    hands,
    collected: { ...hand.collected, [bidder]: pile },
    currentTrick: [],
    toPlayerId: null,
    ended: true,
  };
  return { hand: scored, fin: finalizeHand(scored) };
}
