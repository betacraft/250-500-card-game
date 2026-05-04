import { describe, it, expect } from 'vitest';
import { trickWinner, isLegalPlay } from './winner';

describe('trickWinner', () => {
  it('highest of led suit wins when no trump played', () => {
    const winner = trickWinner(
      [
        { playerId: 'p1', card: { suit: 'hearts', rank: '7' } },
        { playerId: 'p2', card: { suit: 'hearts', rank: 'K' } },
        { playerId: 'p3', card: { suit: 'diamonds', rank: 'A' } },
      ],
      'spades',
    );
    expect(winner?.playerId).toBe('p2');
  });

  it('any trump beats highest non-trump', () => {
    const winner = trickWinner(
      [
        { playerId: 'p1', card: { suit: 'hearts', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'spades', rank: '3' } },
      ],
      'spades',
    );
    expect(winner?.playerId).toBe('p2');
  });

  it('highest trump wins when multiple trumps', () => {
    const winner = trickWinner(
      [
        { playerId: 'p1', card: { suit: 'hearts', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'spades', rank: '5' } },
        { playerId: 'p3', card: { suit: 'spades', rank: 'K' } },
      ],
      'spades',
    );
    expect(winner?.playerId).toBe('p3');
  });

  it('off-suit non-trump cards cannot win', () => {
    const winner = trickWinner(
      [
        { playerId: 'p1', card: { suit: 'hearts', rank: '5' } },
        { playerId: 'p2', card: { suit: 'diamonds', rank: 'A' } },
        { playerId: 'p3', card: { suit: 'clubs', rank: 'A' } },
      ],
      'spades',
    );
    expect(winner?.playerId).toBe('p1');
  });

  it('first played wins on identical cards (500 two-deck case)', () => {
    const winner = trickWinner(
      [
        { playerId: 'p1', card: { suit: 'spades', rank: 'A' } },
        { playerId: 'p2', card: { suit: 'spades', rank: 'A' } },
      ],
      'spades',
    );
    expect(winner?.playerId).toBe('p1');
  });

  it('returns null on empty', () => {
    expect(trickWinner([], 'spades')).toBeNull();
  });
});

describe('isLegalPlay', () => {
  const hand = [
    { suit: 'hearts' as const, rank: 'A' as const },
    { suit: 'spades' as const, rank: '7' as const },
    { suit: 'clubs' as const, rank: 'K' as const },
  ];

  it('first card (no led suit yet) — anything is legal', () => {
    expect(isLegalPlay({ card: hand[0]!, hand, ledSuit: null })).toBe(true);
    expect(isLegalPlay({ card: hand[2]!, hand, ledSuit: null })).toBe(true);
  });

  it('must follow led suit when holding it', () => {
    expect(isLegalPlay({ card: hand[0]!, hand, ledSuit: 'hearts' })).toBe(true); // hearts in hand, played hearts
    expect(isLegalPlay({ card: hand[1]!, hand, ledSuit: 'hearts' })).toBe(false); // played spades but had hearts
  });

  it('any card legal when void in led suit', () => {
    expect(isLegalPlay({ card: hand[1]!, hand, ledSuit: 'diamonds' })).toBe(true); // void in diamonds
    expect(isLegalPlay({ card: hand[2]!, hand, ledSuit: 'diamonds' })).toBe(true);
  });

  it('rejects card not in hand', () => {
    expect(
      isLegalPlay({
        card: { suit: 'diamonds', rank: 'A' },
        hand,
        ledSuit: null,
      }),
    ).toBe(false);
  });
});
