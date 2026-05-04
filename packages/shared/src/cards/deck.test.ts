import { describe, it, expect } from 'vitest';
import { buildDeck, shuffle, deal, cardPointValue } from './deck';

describe('deck', () => {
  it('250 deck: 48 cards, no 2s', () => {
    const d = buildDeck('250');
    expect(d).toHaveLength(48);
    expect(d.every((c) => c.rank !== ('2' as never))).toBe(true);
  });

  it('500 deck: 96 cards (two decks)', () => {
    const d = buildDeck('500');
    expect(d).toHaveLength(96);
  });

  it('250 deck: 4 of each rank (one per suit)', () => {
    const d = buildDeck('250');
    const ranks = d.reduce<Record<string, number>>((acc, c) => {
      acc[c.rank] = (acc[c.rank] ?? 0) + 1;
      return acc;
    }, {});
    expect(ranks['A']).toBe(4);
    expect(ranks['10']).toBe(4);
  });

  it('500 deck: 8 of each rank (two decks)', () => {
    const d = buildDeck('500');
    const ranks = d.reduce<Record<string, number>>((acc, c) => {
      acc[c.rank] = (acc[c.rank] ?? 0) + 1;
      return acc;
    }, {});
    expect(ranks['A']).toBe(8);
  });

  it('shuffle is deterministic with the same seed', () => {
    const d = buildDeck('250');
    const a = shuffle(d, 42);
    const b = shuffle(d, 42);
    expect(a).toEqual(b);
  });

  it('shuffle changes order (different from input)', () => {
    const d = buildDeck('250');
    const s = shuffle(d, 1);
    expect(s).not.toEqual(d);
    expect(s).toHaveLength(d.length);
  });

  it('deal evenly distributes 48 cards to 6 hands of 8', () => {
    const d = buildDeck('250');
    const hands = deal(d, 6);
    expect(hands).toHaveLength(6);
    expect(hands.every((h) => h.length === 8)).toBe(true);
  });

  it('deal evenly distributes 96 cards to 8 hands of 12', () => {
    const d = buildDeck('500');
    const hands = deal(d, 8);
    expect(hands.every((h) => h.length === 12)).toBe(true);
  });

  it('deal throws if not divisible', () => {
    expect(() => deal([1, 2, 3], 2)).toThrow();
  });

  it('cardPointValue returns 10 for A/K/Q/J/10', () => {
    expect(cardPointValue({ suit: 'hearts', rank: 'A' })).toBe(10);
    expect(cardPointValue({ suit: 'spades', rank: '10' })).toBe(10);
  });

  it('cardPointValue returns 5 for 5s', () => {
    expect(cardPointValue({ suit: 'clubs', rank: '5' })).toBe(5);
  });

  it('cardPointValue returns 0 for everything else (incl 3s — special handling elsewhere)', () => {
    expect(cardPointValue({ suit: 'spades', rank: '3' })).toBe(0);
    expect(cardPointValue({ suit: 'hearts', rank: '3' })).toBe(0);
    expect(cardPointValue({ suit: 'diamonds', rank: '7' })).toBe(0);
  });

  it('250 total card points = 250 (after 3♠ +30 special added)', () => {
    const d = buildDeck('250');
    const base = d.reduce((sum, c) => sum + cardPointValue(c), 0);
    expect(base).toBe(220); // 4*10*5 + 4*5 = 200 + 20 = 220; +30 for 3♠ = 250
  });

  it('500 base total = 440 (200*2 - just 5s and AKQJT) + 60 for 3♠ + 3♥', () => {
    const d = buildDeck('500');
    const base = d.reduce((sum, c) => sum + cardPointValue(c), 0);
    expect(base).toBe(440); // 8*10*5 + 8*5 = 400 + 40; +30+30 = 500
  });
});
