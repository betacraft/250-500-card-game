import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { announceLock, EMPTY_LATCH, latchLock, lockChrome, noteLatchedLock } from './lock-latch';
import { RecapHeading } from './recap-heading';

describe('lock latch', () => {
  it('keeps a mid-hand lock, the banner, and Finish after the next card', () => {
    const first = latchLock(EMPTY_LATCH, 'made', false, false);
    const midTrick = latchLock(first, null, false, false);
    expect(midTrick).toEqual({ kind: 'made', lastTrick: false });
    const chrome = lockChrome(midTrick, 'playing');
    expect(chrome.banner).toBe('made');
    expect(chrome.finish).toBe(true);
    expect(chrome.recapStinger).toBeNull();
    expect(lockChrome(midTrick, 'scored').finish).toBe(false);
    const play = vi.fn();
    announceLock(midTrick, 'playing', { banner: false, recap: false }, play);
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith('made');
  });

  it('gives a last-trick lock no banner and no Finish, and stings as the recap opens', () => {
    const latch = latchLock(EMPTY_LATCH, 'sunk', true, false);
    expect(latch).toEqual({ kind: 'sunk', lastTrick: true });
    const during = lockChrome(latch, 'playing');
    expect(during.banner).toBeNull();
    expect(during.finish).toBe(false);
    const play = vi.fn();
    expect(announceLock(latch, 'playing', { banner: false, recap: false }, play)).toEqual({ banner: false, recap: false });
    expect(play).not.toHaveBeenCalled();
    const scored = lockChrome(latch, 'scored');
    expect(scored.banner).toBeNull();
    expect(scored.finish).toBe(false);
    expect(scored.recapStinger).toBe('sunk');
    announceLock(latch, 'scored', { banner: false, recap: false }, play);
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith('sunk');
    const sample = { lockTrick: null, lockKind: null as 'made' | 'sunk' | null };
    noteLatchedLock(sample, latch, 8);
    expect(sample).toEqual({ lockKind: 'sunk', lockTrick: 8 });
    noteLatchedLock(sample, latchLock(EMPTY_LATCH, 'made', false, false), 3);
    expect(sample.lockTrick).toBe(8);
  });

  it('forgets the lock when the next hand is dealt', () => {
    const held = latchLock(EMPTY_LATCH, 'made', false, false);
    expect(latchLock(held, 'sunk', true, true)).toEqual(EMPTY_LATCH);
  });
});

describe('recap heading', () => {
  it('uses the bang and the team colour only for a last-trick lock', () => {
    const { rerender } = render(<RecapHeading made lastTrick={false} reduced={false} />);
    expect(screen.getByRole('heading', { name: 'Bid made' })).toBeInTheDocument();
    expect(screen.queryByTestId('recap-header')).toBeNull();
    rerender(<RecapHeading made lastTrick reduced={false} />);
    const made = screen.getByTestId('recap-header');
    expect(made).toHaveTextContent('Bid made!');
    expect(made.className).toContain('text-felt');
    expect(made.className).toContain('recap-title-pop');
    rerender(<RecapHeading made={false} lastTrick reduced={false} />);
    const sunk = screen.getByTestId('recap-header');
    expect(sunk).toHaveTextContent('Bid sunk!');
    expect(sunk.className).toContain('text-[#7A3E2E]');
  });
});
