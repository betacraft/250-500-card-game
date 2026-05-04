import type { Card } from './types';
import { SUITS_ORDERED, RANKS_ORDERED } from './types';
import type { GameType } from '../games/types';

/** Build a fresh deck for the given game type.
 * 250: one deck minus 2s = 48 cards.
 * 500: two decks minus 2s = 96 cards (each card appears twice).
 */
export function buildDeck(gameType: GameType): Card[] {
  const decks = gameType === '250' ? 1 : 2;
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS_ORDERED) {
      for (const rank of RANKS_ORDERED) {
        cards.push({ suit, rank });
      }
    }
  }
  return cards;
}

/** Mulberry32 PRNG for deterministic shuffles in tests. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle. Pass a seed for deterministic output (testing). */
export function shuffle<T>(items: readonly T[], seed?: number): T[] {
  const rand = seed === undefined ? Math.random : mulberry32(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** Deal an array of cards into N hands of equal size. */
export function deal<T>(cards: readonly T[], handCount: number): T[][] {
  if (cards.length % handCount !== 0) {
    throw new Error(`Cannot deal ${cards.length} cards evenly to ${handCount} hands`);
  }
  const cardsPerHand = cards.length / handCount;
  const hands: T[][] = Array.from({ length: handCount }, () => []);
  for (let i = 0; i < cards.length; i++) {
    hands[i % handCount]!.push(cards[i]!);
  }
  // Optionally simplify so that each hand gets contiguous cards rather than round-robin
  // Round-robin keeps deal-order deterministic with seed; either works.
  void cardsPerHand;
  return hands;
}

/** Card-point value per RULES.md (250 + 500 share these face values). */
export function cardPointValue(card: Card): number {
  if (card.rank === 'A' || card.rank === 'K' || card.rank === 'Q' || card.rank === 'J' || card.rank === '10') return 10;
  if (card.rank === '5') return 5;
  // 3 of spades and 3 of hearts have special 30-point handling but only on FIRST played per hand;
  // that's handled at trick-collection time, not in this raw value function.
  return 0;
}
