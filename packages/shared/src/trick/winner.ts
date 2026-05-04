import type { Card, Suit } from '../cards/types';
import { RANKS_ORDERED } from '../cards/types';

export interface PlayedCard {
  /** Player who played the card */
  playerId: string;
  /** The card */
  card: Card;
}

const RANK_ORDER: Record<string, number> = (() => {
  const r: Record<string, number> = {};
  RANKS_ORDERED.forEach((rank, i) => (r[rank] = i));
  return r;
})();

/** Compare two cards of the same suit; positive if a > b. */
function compareRank(a: Card, b: Card): number {
  return (RANK_ORDER[a.rank] ?? 0) - (RANK_ORDER[b.rank] ?? 0);
}

/** Determine the winner of a completed trick.
 * Rules:
 * - The first card played sets the led suit.
 * - Highest trump wins; otherwise highest of led suit wins.
 * - Cards of suits that are neither trump nor led suit cannot win.
 * - In case of identical cards (only possible in 500 with two decks), the FIRST played wins.
 */
export function trickWinner(played: readonly PlayedCard[], trump: Suit): PlayedCard | null {
  const first = played[0];
  if (!first) return null;
  const led = first.card.suit;
  const trumps = played.filter((p) => p.card.suit === trump);
  if (trumps.length > 0) {
    return trumps.reduce((best, p) => (compareRank(p.card, best.card) > 0 ? p : best));
  }
  const ledSuitCards = played.filter((p) => p.card.suit === led);
  return ledSuitCards.reduce((best, p) => (compareRank(p.card, best.card) > 0 ? p : best));
}

/** Validate that a player can play `card` given the led suit and their hand.
 * Must follow led suit if able; otherwise any card (including trump).
 */
export function isLegalPlay(args: {
  card: Card;
  hand: readonly Card[];
  ledSuit: Suit | null;
}): boolean {
  const inHand = args.hand.some((c) => c.suit === args.card.suit && c.rank === args.card.rank);
  if (!inHand) return false;
  if (!args.ledSuit) return true; // first card sets the led suit
  if (args.card.suit === args.ledSuit) return true;
  // playing off-suit only allowed if void in led suit
  return !args.hand.some((c) => c.suit === args.ledSuit);
}
