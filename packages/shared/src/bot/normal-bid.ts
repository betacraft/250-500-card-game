import type { Card, Suit } from '../cards/types';
import type { GameType } from '../games/types';
import type { BidDecision } from './easy-bid';
import { chooseCalledCards, chooseTrump } from './easy-bid';
import { estimateNormalBid } from './normal-search';

/** Trump from Easy's shape rule, then Easy's called cards. */
export function chooseNormalDeclaration(hand: readonly Card[], gameType: GameType): { trump: Suit; called: Card[] } {
  const trump = chooseTrump(hand);
  return { trump, called: chooseCalledCards(hand, trump, gameType) };
}

/**
 * Bid the highest level where P(make) × gain − (1 − P(make)) × loss
 * clears the safety margin. The stake is the bidder's ±(bid + bonus).
 */
export function chooseNormalBid(args: {
  gameType: GameType;
  hand: readonly Card[];
  highBid: number | null;
  rng: () => number;
}): BidDecision {
  const estimate = estimateNormalBid({
    gameType: args.gameType,
    hand: args.hand,
    highBid: args.highBid,
    rng: args.rng,
    deadline: performance.now() + 120,
  });
  if (estimate.action === 'pass' || estimate.amount === undefined) return { action: 'pass' };
  return { action: 'bid', amount: estimate.amount };
}
