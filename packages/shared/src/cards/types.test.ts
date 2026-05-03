import { describe, it, expect } from 'vitest';
import { cardSchema, cardId, suitColor, SUITS_ORDERED, RANKS_ORDERED } from './types';

describe('card primitives', () => {
  it('cardSchema parses a valid card', () => {
    const result = cardSchema.safeParse({ suit: 'hearts', rank: 'Q' });
    expect(result.success).toBe(true);
  });

  it('cardSchema rejects invalid suit', () => {
    const result = cardSchema.safeParse({ suit: 'stars', rank: 'Q' });
    expect(result.success).toBe(false);
  });

  it('cardSchema rejects invalid rank (e.g. 2 — excluded)', () => {
    const result = cardSchema.safeParse({ suit: 'spades', rank: '2' });
    expect(result.success).toBe(false);
  });

  it('cardId produces stable identifiers', () => {
    expect(cardId({ suit: 'hearts', rank: 'A' })).toBe('Ah');
    expect(cardId({ suit: 'spades', rank: '10' })).toBe('10s');
    expect(cardId({ suit: 'diamonds', rank: 'K' })).toBe('Kd');
  });

  it('suitColor returns red for hearts/diamonds, black for spades/clubs', () => {
    expect(suitColor('hearts')).toBe('red');
    expect(suitColor('diamonds')).toBe('red');
    expect(suitColor('spades')).toBe('black');
    expect(suitColor('clubs')).toBe('black');
  });

  it('SUITS_ORDERED has 4 suits', () => {
    expect(SUITS_ORDERED).toHaveLength(4);
  });

  it('RANKS_ORDERED has 12 ranks (no 2)', () => {
    expect(RANKS_ORDERED).toHaveLength(12);
    expect(RANKS_ORDERED).not.toContain('2');
  });
});
