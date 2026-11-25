/** The first public lock of a hand, kept until the next deal. */
export interface LockLatch {
  kind: 'made' | 'sunk' | null;
  /** The first lock arrived as the hand ended. */
  lastTrick: boolean;
}

export const EMPTY_LATCH: LockLatch = { kind: null, lastTrick: false };

/**
 * Keep the first lock. `sample` is only meaningful at a trick boundary.
 * A null sample does not clear a lock. `reset` starts a new hand.
 */
export function latchLock(
  current: LockLatch,
  sample: 'made' | 'sunk' | null,
  ended: boolean,
  reset: boolean,
): LockLatch {
  if (reset) return EMPTY_LATCH;
  if (current.kind !== null || sample === null) return current;
  return { kind: sample, lastTrick: ended };
}

export interface LockChrome {
  /** Mid-hand lock banner. A last-trick lock has none. */
  banner: 'made' | 'sunk' | null;
  /** Finish stays up from a mid-hand lock until the hand leaves play. */
  finish: boolean;
  /** Stinger that plays as the recap opens. Only a last-trick lock. */
  recapStinger: 'made' | 'sunk' | null;
}

/** What the table shows for a latched lock. */
export function lockChrome(latch: LockLatch, phase: string): LockChrome {
  const mid = latch.kind !== null && !latch.lastTrick;
  const playing = phase === 'playing';
  return {
    banner: mid && playing ? latch.kind : null,
    finish: mid && playing,
    recapStinger: latch.lastTrick && phase === 'scored' ? latch.kind : null,
  };
}

/**
 * Play the stinger once for a mid-hand banner, and once when a last-trick recap opens.
 * A scored hand does not start the banner stinger.
 */
export function announceLock(
  latch: LockLatch,
  phase: string,
  flags: { banner: boolean; recap: boolean },
  play: (kind: 'made' | 'sunk') => void,
): { banner: boolean; recap: boolean } {
  const chrome = lockChrome(latch, phase);
  const next = { banner: flags.banner, recap: flags.recap };
  if (chrome.banner && !next.banner && latch.kind) {
    next.banner = true;
    play(latch.kind);
  }
  if (chrome.recapStinger && !next.recap) {
    next.recap = true;
    play(chrome.recapStinger);
  }
  return next;
}
