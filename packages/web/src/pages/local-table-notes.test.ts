import { describe, expect, it } from 'vitest';
import { privateNotice } from './local-table-notes';

describe('private holding notice', () => {
  const called = [
    { suit: 'hearts' as const, rank: 'A' as const },
    { suit: 'spades' as const, rank: 'K' as const },
  ];
  const hand = [{ suit: 'hearts' as const, rank: 'A' as const }];

  it('tells a 250 holder they are a partner', () => {
    expect(privateNotice(hand, called, 'p2', '250', [])).toBe("You're a partner");
    expect(privateNotice(hand, called, 'p1', '250', [])).toBeNull();
  });

  it('tells a 500 holder only that they hold a called card, until someone else fills it', () => {
    expect(privateNotice(hand, called, 'p2', '500', [{ card: called[0]!, filledBy: null }])).toBe('You hold a called card');
    expect(privateNotice(hand, called, 'p2', '500', [{ card: called[0]!, filledBy: 'p3' }])).toBeNull();
  });
});
