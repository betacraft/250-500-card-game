import { describe, expect, it } from 'vitest';
import { EMPTY_REVEAL_QUEUE, pushReveals, releaseHeld, resumeReveal, revealNotices, tickReveal } from './reveal-queue';

const names = { p1: 'Ada', p3: 'Bot 3', p4: 'Bot 4' };

describe('reveal queue', () => {
  it('shows two reveals from one trick one after another', () => {
    const notices = revealNotices([], ['p3', 'p1'], names, 'p1');
    expect(notices.map((notice) => notice.text)).toEqual(["Bot 3 is a partner!", "You're a partner!"]);
    let queue = pushReveals(EMPTY_REVEAL_QUEUE, notices, 0);
    expect(queue.current?.playerId).toBe('p3');
    expect(queue.pending.map((notice) => notice.playerId)).toEqual(['p1']);
    expect(tickReveal(queue, 1499).current?.playerId).toBe('p3');
    queue = tickReveal(queue, 1500);
    expect(queue.current?.playerId).toBe('p1');
    expect(queue.pending).toEqual([]);
    expect(tickReveal(queue, 3000).current).toBeNull();
  });

  it('does not announce a partner who has not been revealed', () => {
    expect(revealNotices([], [], names, 'p1')).toEqual([]);
    expect(revealNotices(['p1'], ['p1'], names, 'p1')).toEqual([]);
    expect(revealNotices(['p1'], ['p1', 'p4'], names, 'p1')).toEqual([
      { playerId: 'p4', text: 'Bot 4 is a partner!' },
    ]);
  });

  it('drops a held toast once the hand is scored', () => {
    const [first] = revealNotices([], ['p4'], names, 'p1');
    if (!first) throw new Error('missing notice');
    const queued = pushReveals(EMPTY_REVEAL_QUEUE, [first], 0);
    expect(releaseHeld(queued, 1_000, true).current).toBeNull();
    expect(releaseHeld(queued, 1_000, false).current?.playerId).toBe('p4');
  });

  it('gives a parked toast its full time after the banner', () => {
    const [first] = revealNotices([], ['p3'], names, 'p1');
    if (!first) throw new Error('missing notice');
    const queued = pushReveals(EMPTY_REVEAL_QUEUE, [first], 0);
    const resumed = resumeReveal(queued, 5_000);
    expect(resumed.current?.playerId).toBe('p3');
    expect(resumed.until).toBe(6_500);
    expect(tickReveal(resumed, 6_499).current?.playerId).toBe('p3');
  });

  it('does not stack a second copy of the same reveal', () => {
    const [first] = revealNotices([], ['p3'], names, 'p1');
    if (!first) throw new Error('missing notice');
    const once = pushReveals(EMPTY_REVEAL_QUEUE, [first], 0);
    expect(pushReveals(once, [first], 10)).toBe(once);
  });
});
