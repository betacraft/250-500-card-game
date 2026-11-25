import { describe, expect, it } from 'vitest';
import { isForcedFollow } from './forced-play';

const five = { suit: 'clubs' as const, rank: '5' as const, id: 'a' };
const fiveCopy = { suit: 'clubs' as const, rank: '5' as const, id: 'b' };
const king = { suit: 'hearts' as const, rank: 'K' as const, id: 'c' };

describe('forced follow', () => {
  it('never fires on a lead or when two different faces are legal', () => {
    expect(isForcedFollow(true, [five])).toBe(false);
    expect(isForcedFollow(false, [five, king])).toBe(false);
    expect(isForcedFollow(false, [])).toBe(false);
  });

  it('fires for one card and for identical copies', () => {
    expect(isForcedFollow(false, [five])).toBe(true);
    expect(isForcedFollow(false, [five, fiveCopy])).toBe(true);
  });
});
