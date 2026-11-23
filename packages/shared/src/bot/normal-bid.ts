import type { Card, Suit } from '../cards/types';
import { SUITS_ORDERED } from '../cards/types';
import { rulesFor } from '../games';
import type { GameType } from '../games/types';
import type { BidDecision } from './easy-bid';
import { chooseCalledCards, chooseTrump, projectedTeamPoints } from './easy-bid';

/**
 * Normal bidding. A full Monte Carlo auction is not cheap: every seat would
 * replay the hand inside the 150ms card-play budget. This keeps Easy's margin
 * and adds trump shape: long trump and side voids bid higher, a short trump bids lower.
 * Noise is rarer than Easy so the estimate is usually the bid.
 */
/** Trump from the same shape estimate as the bid, then the called cards. */
export function chooseNormalDeclaration(hand: readonly Card[], gameType: GameType): { trump: Suit; called: Card[] } {
  let trump = chooseTrump(hand);
  let best = -1;
  for (const suit of SUITS_ORDERED) {
    const score = shapedPoints(hand, suit, gameType);
    if (score > best) {
      best = score;
      trump = suit;
    }
  }
  return { trump, called: chooseCalledCards(hand, trump, gameType) };
}

export function chooseNormalBid(args: {
  gameType: GameType;
  hand: readonly Card[];
  highBid: number | null;
  rng: () => number;
}): BidDecision {
  const trump = chooseTrump(args.hand);
  const team = shapedPoints(args.hand, trump, args.gameType);
  return applyNoise(rawBid(team, args.gameType, args.highBid), team, args.gameType, args.highBid, args.rng);
}

function shapedPoints(hand: readonly Card[], trump: Suit, gameType: GameType): number {
  const trumpCount = hand.filter((card) => card.suit === trump).length;
  const voids = SUITS_ORDERED.filter((suit) => suit !== trump && !hand.some((card) => card.suit === suit)).length;
  let team = projectedTeamPoints(hand, trump, gameType) + voids * 6;
  if (trumpCount >= 5) team += 12;
  else if (trumpCount <= 2) team -= 16;
  return Math.max(0, Math.min(rulesFor(gameType).TOTAL_POINTS, team));
}

function rawBid(team: number, gameType: GameType, highBid: number | null): BidDecision {
  const rules = rulesFor(gameType);
  const margin = gameType === '250' ? 20 : 35;
  const stepped = Math.floor((team - margin) / rules.BID_INCREMENT) * rules.BID_INCREMENT;
  if (stepped < rules.MIN_BID) return { action: 'pass' };
  const ceiling = Math.min(rules.MAX_BID, stepped);
  let best: number | null = null;
  for (let amount = rules.MIN_BID; amount <= ceiling; amount += rules.BID_INCREMENT) {
    if (highBid !== null && amount <= highBid) continue;
    best = amount;
  }
  return best === null ? { action: 'pass' } : { action: 'bid', amount: best };
}

function applyNoise(
  base: BidDecision,
  team: number,
  gameType: GameType,
  highBid: number | null,
  rng: () => number,
): BidDecision {
  if (rng() >= 0.08) return base;
  const rules = rulesFor(gameType);
  const step = rules.BID_INCREMENT;
  if (base.action === 'pass') {
    const amount = highBid === null ? rules.MIN_BID : highBid + step;
    if (amount <= team && amount <= rules.MAX_BID) return { action: 'bid', amount };
    return base;
  }
  const amount = (base.amount ?? rules.MIN_BID) + (rng() < 0.5 ? -step : step);
  if (amount > team || amount > rules.MAX_BID || amount < rules.MIN_BID) return base;
  if (highBid !== null && amount <= highBid) return base;
  return { action: 'bid', amount };
}
