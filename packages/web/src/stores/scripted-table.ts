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
import { labelTrick } from './scripted-fan';

const HUMAN_ID = 'p1';

export type DevScript = 'long' | 'over' | 'trick' | 'reveal' | 'declared' | 'labels';

/** Dev-only `?script=` values. Production builds never read the query. */
export function devScript(): DevScript | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  try {
    const value = new URLSearchParams(window.location.search).get('script');
    if (value === 'long' || value === 'over' || value === 'trick' || value === 'reveal' || value === 'declared' || value === 'labels') return value;
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
  if (script !== 'over' && script !== 'trick' && script !== 'reveal' && script !== 'declared' && script !== 'labels') return null;
  const seats = localSeatIds(rulesFor(gameType).PLAYER_COUNT);
  const name = humanName.trim() || 'You';
  const bidder = seats[1] ?? HUMAN_ID;
  let hand = startHand({ gameType, seatOrder: seats, firstBidderId: bidder, seed: 7 });
  const rules = rulesFor(gameType);
  hand = setBidder(hand, bidder, rules.MIN_BID);
  hand = declareTrumpAndPartners(hand, 'hearts', calledFromOthers(hand, bidder, rules.PARTNERS_TO_CALL));
  if (script === 'declared') hand = { ...hand, toPlayerId: HUMAN_ID };
  if (script === 'reveal') hand = { ...playCalledCard(hand), toPlayerId: null };
  if (script === 'labels') hand = labelTrick(hand);
  if (script !== 'over') {
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
      const played = hand.gameType === '250' ? leadCalled(hand, seat, card) : followCalled(hand, seat, card);
      if (played) return played;
    }
  }
  return hand;
}

function leadCalled(hand: GameHand, seat: string, card: Card): GameHand | null {
  const result = playCard({ ...hand, toPlayerId: seat, currentTrick: [] }, seat, card);
  return result.ok ? result.state : null;
}

/** 500 cannot lead a called card. Someone else leads the suit, and this seat's only card of it is the call. */
function followCalled(hand: GameHand, seat: string, called: Card): GameHand | null {
  const leaderId = hand.seatOrder.find((id) => id !== seat);
  if (!leaderId) return null;
  const hands: Record<string, Card[]> = {};
  for (const id of hand.seatOrder) hands[id] = [...(hand.hands[id] ?? [])];
  hands[seat] = (hands[seat] ?? []).filter((card) => card.suit !== called.suit || card.id === called.id);
  const lead = hand.seatOrder.flatMap((id) => (id === seat ? [] : hands[id] ?? [])).find((card) => card.suit === called.suit)
    ?? { suit: called.suit, rank: '4' as const, id: 'script-lead' };
  if (lead.id !== 'script-lead') {
    for (const id of hand.seatOrder) hands[id] = (hands[id] ?? []).filter((card) => card.id !== lead.id);
  }
  const result = playCard({
    ...hand,
    hands,
    currentTrick: [{ playerId: leaderId, card: lead }],
    toPlayerId: seat,
  }, seat, called);
  return result.ok ? result.state : null;
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
