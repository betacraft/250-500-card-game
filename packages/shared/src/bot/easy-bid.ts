import type { Card, Rank, Suit } from '../cards/types';
import { cardId, RANKS_ORDERED, SUITS_ORDERED } from '../cards/types';
import { rulesFor } from '../games';
import type { GameType } from '../games/types';

const FACE_RANKS = new Set<Rank>(['A', 'K', 'Q', 'J', '10']);
const TRUMP_HONORS = new Set<Rank>(['A', 'K', 'Q']);

export interface BidDecision {
  action: 'bid' | 'pass';
  amount?: number;
}

/** Longest suit, then more A/K/Q, then a 3 in that suit. */
export function chooseTrump(hand: readonly Card[]): Suit {
  let best: Suit = 'spades';
  let bestLen = -1;
  let bestHigh = -1;
  let best3 = -1;
  for (const suit of SUITS_ORDERED) {
    const cards = hand.filter((card) => card.suit === suit);
    const highs = cards.filter((card) => TRUMP_HONORS.has(card.rank)).length;
    const has3 = cards.some((card) => card.rank === '3') ? 1 : 0;
    const better = cards.length > bestLen || (cards.length === bestLen && highs > bestHigh) || (cards.length === bestLen && highs === bestHigh && has3 > best3);
    if (better) {
      best = suit;
      bestLen = cards.length;
      bestHigh = highs;
      best3 = has3;
    }
  }
  return best;
}

/** Aces then kings, off-trump first. Skip a held face while an unheld ace or king remains. */
export function chooseCalledCards(hand: readonly Card[], trump: Suit, gameType: GameType): Card[] {
  const need = rulesFor(gameType).PARTNERS_TO_CALL;
  const held = (suit: Suit, rank: Rank): boolean => hand.some((card) => card.suit === suit && card.rank === rank);
  const suits = [...SUITS_ORDERED.filter((suit) => suit !== trump), trump];
  const unheld: Card[] = [];
  const heldHonors: Card[] = [];
  for (const rank of ['A', 'K'] as const) {
    for (const suit of suits) {
      const card = { suit, rank };
      if (held(suit, rank)) heldHonors.push(card);
      else unheld.push(card);
    }
  }
  const fillers: Card[] = [];
  for (const rank of RANKS_ORDERED) {
    if (rank === 'A' || rank === 'K') continue;
    for (const suit of suits) fillers.push({ suit, rank });
  }
  return uniqueFaces([...unheld, ...heldHonors, ...fillers]).slice(0, need);
}

/**
 * Easy auction action. Bids the highest step at or under team_E minus the margin,
 * never above team_E, and stays at the floor when team_E is only 0–30 above it.
 * 20% of the time the result shifts by one legal step.
 */
export function chooseBid(args: {
  gameType: GameType;
  hand: readonly Card[];
  highBid: number | null;
  rng: () => number;
}): BidDecision {
  const trump = chooseTrump(args.hand);
  const calls = chooseCalledCards(args.hand, trump, args.gameType);
  const own = ownExpectation(args.hand, trump, args.gameType);
  const team = teamExpectation(args.hand, calls, args.gameType, own);
  const base = rawBid(team, args.gameType, args.highBid);
  return applyBidNoise(base, team, args.gameType, args.highBid, args.rng);
}

function uniqueFaces(cards: readonly Card[]): Card[] {
  const seen = new Set<string>();
  const out: Card[] = [];
  for (const card of cards) {
    const key = cardId(card);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(card);
  }
  return out;
}

function ownExpectation(hand: readonly Card[], trump: Suit, gameType: GameType): number {
  const pot = rulesFor(gameType).TOTAL_POINTS;
  let value = 0;
  for (const card of hand) {
    if (FACE_RANKS.has(card.rank)) value += 10;
    else if (card.rank === '5') value += 5;
  }
  const premiums: Suit[] = gameType === '250' ? ['spades'] : ['spades', 'hearts'];
  for (const suit of premiums) value += 30 * firstCopyChance(hand, suit);
  const trumpCards = hand.filter((card) => card.suit === trump);
  value += 8 * (trumpCards.length - 3);
  value += 10 * trumpCards.filter((card) => TRUMP_HONORS.has(card.rank)).length;
  return clamp(value, 0, pot);
}

function firstCopyChance(hand: readonly Card[], suit: Suit): number {
  const copies = hand.filter((card) => card.suit === suit && card.rank === '3').length;
  const length = hand.filter((card) => card.suit === suit).length;
  if (copies >= 2) return 1;
  if (copies === 1 && length >= 4) return 0.7;
  if (copies === 1) return 0.5;
  return 0;
}

function teamExpectation(hand: readonly Card[], calls: readonly Card[], gameType: GameType, own: number): number {
  const rules = rulesFor(gameType);
  const pot = rules.TOTAL_POINTS;
  const maxCopies = gameType === '250' ? 1 : 2;
  let guess: number = rules.MIN_BID;
  let team = own;
  for (let pass = 0; pass < 4; pass += 1) {
    const comeOut = own + 80 >= guess ? 0.75 : 0.4;
    let partner = 0;
    for (const call of calls) {
      const held = hand.filter((card) => card.suit === call.suit && card.rank === call.rank).length;
      partner += 0.18 * pot * comeOut * (Math.max(0, maxCopies - held) / maxCopies);
    }
    team = clamp(own + partner, 0, pot);
    const next = rawBid(team, gameType, null);
    const nextGuess = next.action === 'bid' ? (next.amount ?? guess) : guess;
    if (nextGuess === guess) return team;
    guess = nextGuess;
  }
  return team;
}

function rawBid(team: number, gameType: GameType, highBid: number | null): BidDecision {
  const rules = rulesFor(gameType);
  const margin = gameType === '250' ? 15 : 25;
  if (team < rules.MIN_BID) return { action: 'pass' };
  const ceiling = team <= rules.MIN_BID + 30 ? rules.MIN_BID : Math.min(rules.MAX_BID, team - margin, team);
  let best: number | null = null;
  for (let amount = rules.MIN_BID; amount <= ceiling + 1e-9; amount += rules.BID_INCREMENT) {
    if (amount > team) break;
    if (highBid !== null && amount <= highBid) continue;
    if (amount > rules.MAX_BID) break;
    best = amount;
  }
  return best === null ? { action: 'pass' } : { action: 'bid', amount: best };
}

function applyBidNoise(
  base: BidDecision,
  team: number,
  gameType: GameType,
  highBid: number | null,
  rng: () => number,
): BidDecision {
  if (rng() >= 0.2) return base;
  const rules = rulesFor(gameType);
  const step = rules.BID_INCREMENT;
  if (base.action === 'pass') {
    const amount = highBid === null ? rules.MIN_BID : highBid + step;
    if (amount <= team && amount <= rules.MAX_BID) return { action: 'bid', amount };
    return base;
  }
  const dir = rng() < 0.5 ? -step : step;
  const amount = (base.amount ?? rules.MIN_BID) + dir;
  if (amount > team || amount > rules.MAX_BID) return base;
  if (amount < rules.MIN_BID) return { action: 'pass' };
  if (highBid !== null && amount <= highBid) return base;
  return { action: 'bid', amount };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
