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
  const team = projectedTeamPoints(args.hand, trump, args.gameType);
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

/** Project the points this hand can support, scaled to the whole pot rather than one seat's raw cards. */
function projectedTeamPoints(hand: readonly Card[], trump: Suit, gameType: GameType): number {
  const rules = rulesFor(gameType);
  const trumpCards = hand.filter((card) => card.suit === trump);
  const honors = trumpCards.filter((card) => TRUMP_HONORS.has(card.rank)).length;
  const sideAces = hand.filter((card) => card.suit !== trump && card.rank === 'A').length;
  const sideFaces = hand.filter((card) => card.suit !== trump && FACE_RANKS.has(card.rank)).length;
  const premium = hand.some((card) => card.rank === '3' && (card.suit === 'spades' || (gameType === '500' && card.suit === 'hearts')));
  const anchor = gameType === '250' ? 120 : 250;
  const value = anchor + trumpCards.length * 10 + honors * 12 + sideAces * 8 + sideFaces * 2 + (premium ? 10 : 0);
  return clamp(value, 0, rules.TOTAL_POINTS);
}

function rawBid(team: number, gameType: GameType, highBid: number | null): BidDecision {
  const rules = rulesFor(gameType);
  if (team < rules.MIN_BID) return { action: 'pass' };
  const stepped = Math.floor(team / rules.BID_INCREMENT) * rules.BID_INCREMENT;
  const ceiling = Math.min(rules.MAX_BID, Math.max(rules.MIN_BID, stepped));
  let best: number | null = null;
  for (let amount = rules.MIN_BID; amount <= ceiling; amount += rules.BID_INCREMENT) {
    if (highBid !== null && amount <= highBid) continue;
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
