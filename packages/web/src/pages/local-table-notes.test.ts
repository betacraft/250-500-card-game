import { describe, expect, it } from 'vitest';
import { privateNotice } from './secret-call';

describe('private holding notice', () => {
  const called = [
    { suit: 'hearts' as const, rank: 'A' as const },
    { suit: 'spades' as const, rank: 'K' as const },
  ];
  const hand = [{ suit: 'hearts' as const, rank: 'A' as const }];

  it('keeps a secret hold quiet until the called card is played', () => {
    expect(privateNotice(hand, called, 'p2', '250', [], 'Bot 2', false)).toBe('You hold a called card');
    expect(privateNotice(hand, called, 'p1', '250', [])).toBeNull();
    expect(privateNotice([], called, 'p2', '250', [], 'Bot 2', true)).toBe("You're Bot 2's partner");
  });

  it('names the bidder after a public reveal and counts a leftover called card', () => {
    expect(privateNotice(hand, called, 'p2', '500', [{ card: called[0]!, filledBy: null }], 'Bot 2', false)).toBe('You hold a called card');
    expect(privateNotice(hand, called, 'p2', '500', [{ card: called[0]!, filledBy: 'p3' }], 'Bot 2', false)).toBeNull();
    expect(privateNotice(hand, called, 'p2', '500', [{ card: called[0]!, filledBy: 'p1' }], 'Bot 2', true)).toBe("You're Bot 2's partner · 1 called card left");
    expect(privateNotice([], called, 'p2', '500', [{ card: called[0]!, filledBy: 'p1' }], 'Bot 2', true)).toBe("You're Bot 2's partner");
  });
});
