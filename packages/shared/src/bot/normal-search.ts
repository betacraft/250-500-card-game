import type { Card, Suit } from '../cards/types';
import { buildDeck } from '../cards/deck';
import {
  declareTrumpAndPartners,
  finalizeHand,
  legalPlaysFor,
  playCard,
  setBidder,
  startHand,
} from '../engine/hand';
import { rulesFor } from '../games';
import type { GameType } from '../games/types';
import { chooseCalledCards, chooseTrump } from './easy-bid';
import { choosePlay } from './easy-play';
import { toPublicView } from './public-view';

/** Full-hand samples used to estimate P(make). Stops early if the clock runs out. */
export const BID_SAMPLES = 16;
/**
 * The raw Monte Carlo make-rate runs a little high. Subtract this before
 * the expectation. Tuned on seeds 101 and 2501, frozen before held-out 77113.
 */
export const BID_BIAS: Record<GameType, number> = { '250': 0.06, '500': 0.06 };
/**
 * A bid is taken when its bidder EV, plus this concession cost, is positive.
 * Passing leaves the auction to Easy, which is worth about this many points.
 */
export const PASS_SUBSIDY: Record<GameType, number> = { '250': 18, '500': 24 };

export interface BidEstimate {
  action: 'bid' | 'pass';
  amount?: number;
  /** P(team points ≥ the chosen bid). 0 when the bot passes. */
  makeProbability: number;
}

/**
 * Level that maximises the bidder's expectation, counting the cost of a pass.
 * Gain and loss are both the bidder's stake, ±(bid + bonus), so
 * EV = (2 P(make) − 1) × stake. Passing concedes the auction to Easy,
 * so a bid is taken when EV + PASS_SUBSIDY is positive. The amount is the
 * one with the best EV, not the highest level that still clears.
 * Samples are deals of the unknown remainder of the deck.
 */
export function estimateNormalBid(args: {
  gameType: GameType;
  hand: readonly Card[];
  highBid: number | null;
  rng: () => number;
  samples?: number;
  deadline?: number;
  subsidy?: number;
}): BidEstimate {
  const trump = chooseTrump(args.hand);
  const called = chooseCalledCards(args.hand, trump, args.gameType);
  const points = sampleTeamPoints({
    gameType: args.gameType,
    bidderHand: args.hand,
    trump,
    called,
    rng: args.rng,
    samples: args.samples ?? BID_SAMPLES,
    deadline: args.deadline,
  });
  return chooseBidLevel({
    gameType: args.gameType,
    highBid: args.highBid,
    points,
    bias: BID_BIAS[args.gameType],
    subsidy: args.subsidy ?? PASS_SUBSIDY[args.gameType],
  });
}

/**
 * Pick the bid whose bidder expectation, plus the cost of a pass, is best.
 * A pass wins when every legal level is still negative after that cost.
 * The amount is the best expectation, which is not always the highest level.
 */
export function chooseBidLevel(args: {
  gameType: GameType;
  highBid: number | null;
  points: readonly number[];
  bias?: number;
  subsidy?: number;
}): BidEstimate {
  if (args.points.length === 0) return { action: 'pass', makeProbability: 0 };
  const rules = rulesFor(args.gameType);
  const bias = args.bias ?? BID_BIAS[args.gameType];
  const subsidy = args.subsidy ?? PASS_SUBSIDY[args.gameType];
  let best: number | null = null;
  let bestScore = 0;
  let bestP = 0;
  for (let amount = rules.MIN_BID; amount <= rules.MAX_BID; amount += rules.BID_INCREMENT) {
    if (args.highBid !== null && amount <= args.highBid) continue;
    const made = args.points.reduce((count, total) => count + (total >= amount ? 1 : 0), 0);
    const probability = Math.max(0, made / args.points.length - bias);
    const stake = amount + rules.BIDDER_BONUS;
    const score = (2 * probability - 1) * stake + subsidy;
    if (score > bestScore) {
      best = amount;
      bestScore = score;
      bestP = probability;
    }
  }
  return best === null ? { action: 'pass', makeProbability: 0 } : { action: 'bid', amount: best, makeProbability: bestP };
}

export function sampleTeamPoints(args: {
  gameType: GameType;
  bidderHand: readonly Card[];
  trump: Suit;
  called: readonly Card[];
  rng: () => number;
  samples: number;
  deadline?: number;
}): number[] {
  const out: number[] = [];
  for (let i = 0; i < args.samples; i += 1) {
    if (args.deadline !== undefined && out.length >= 4 && performance.now() >= args.deadline) break;
    const points = oneSample(args.gameType, args.bidderHand, args.trump, args.called, args.rng);
    if (points !== null) out.push(points);
  }
  return out;
}

function oneSample(
  gameType: GameType,
  bidderHand: readonly Card[],
  trump: Suit,
  called: readonly Card[],
  rng: () => number,
): number | null {
  const rules = rulesFor(gameType);
  const seats = Array.from({ length: rules.PLAYER_COUNT }, (_, index) => `p${index + 1}`);
  const bidder = seats[0] ?? 'p1';
  const owned = new Set(bidderHand.map((card) => card.id));
  const rest = buildDeck(gameType).filter((card) => !owned.has(card.id));
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const left = rest[i];
    const right = rest[j];
    if (!left || !right) continue;
    rest[i] = right;
    rest[j] = left;
  }
  const hands: Record<string, Card[]> = { [bidder]: bidderHand.map((card) => ({ ...card })) };
  let cursor = 0;
  for (const seat of seats) {
    if (seat === bidder) continue;
    hands[seat] = rest.slice(cursor, cursor + rules.CARDS_PER_PLAYER);
    cursor += rules.CARDS_PER_PLAYER;
  }
  if (cursor !== rest.length) return null;
  let state = startHand({ gameType, seatOrder: seats, firstBidderId: bidder, seed: 1 });
  state = {
    ...state,
    hands,
    holdersByCardId: holdersOf(hands),
    collected: Object.fromEntries(seats.map((seat) => [seat, [] as Card[]])),
    voids: {},
    currentTrick: [],
    trickCount: 0,
    ended: false,
  };
  state = setBidder(state, bidder, rules.MIN_BID);
  state = declareTrumpAndPartners(state, trump, called.slice());
  let guard = 0;
  while (!state.ended && guard < rules.TOTAL_CARDS + 2) {
    guard += 1;
    const playerId = state.toPlayerId;
    if (!playerId) return null;
    const legal = legalPlaysFor(state, playerId);
    const card = choosePlay(legal, { ...toPublicView(state, playerId), rng: () => 1 });
    const played = playCard(state, playerId, card);
    if (!played.ok) return null;
    state = played.state;
  }
  if (!state.ended) return null;
  return finalizeHand(state).pointsCollected;
}

function holdersOf(hands: Record<string, Card[]>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const [id, cards] of Object.entries(hands)) {
    for (const card of cards) {
      const key = `${card.rank}${card.suit[0]}`;
      const set = map.get(key) ?? new Set<string>();
      set.add(id);
      map.set(key, set);
    }
  }
  return map;
}

/** Deal hidden serials. A seat that is void in a suit is not given that suit. */
export function dealHidden(pool: number[], counts: number[], voids: number[][], rng: () => number): number[][] | null {
  const seats = counts.length;
  const left = pool.slice();
  for (let i = left.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = left[i] ?? 0;
    left[i] = left[j] ?? 0;
    left[j] = swap;
  }
  const dealt: number[][] = Array.from({ length: seats }, () => []);
  const used = new Uint8Array(left.length);
  for (let seat = 0; seat < seats; seat += 1) {
    const banned = new Set(voids[seat] ?? []);
    const need = counts[seat] ?? 0;
    for (let n = 0; n < need; n += 1) {
      let found = -1;
      for (let i = 0; i < left.length; i += 1) {
        if (used[i] === 1) continue;
        const suit = Math.floor(((left[i] ?? 0) % 48) / 12);
        if (banned.has(suit)) continue;
        found = i;
        break;
      }
      if (found < 0) return null;
      used[found] = 1;
      dealt[seat]?.push(left[found] ?? 0);
    }
  }
  return dealt;
}
