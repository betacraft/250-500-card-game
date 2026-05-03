import { z } from 'zod';

/** Suit identifier — kebab-case strings used across UI and storage. */
export const suitSchema = z.enum(['spades', 'hearts', 'diamonds', 'clubs']);
export type Suit = z.infer<typeof suitSchema>;

/** Rank identifier — text labels for ranks. 2s are excluded from both decks. */
export const rankSchema = z.enum(['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
export type Rank = z.infer<typeof rankSchema>;

/** A single card (suit + rank pair). */
export const cardSchema = z.object({
  suit: suitSchema,
  rank: rankSchema,
});
export type Card = z.infer<typeof cardSchema>;

/** Stable string identifier for a card (e.g. "Ah" for ace of hearts). Used as React key. */
export function cardId(card: Card): string {
  const suitLetter = card.suit[0];
  return `${card.rank}${suitLetter}`;
}

/** Display color for a suit (red for hearts/diamonds, black for spades/clubs). */
export function suitColor(suit: Suit): 'red' | 'black' {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

/** All 4 suits in canonical order (used for UI grids). */
export const SUITS_ORDERED: readonly Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'] as const;

/** All 12 ranks in canonical order (used for UI grids). */
export const RANKS_ORDERED: readonly Rank[] = [
  '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A',
] as const;
