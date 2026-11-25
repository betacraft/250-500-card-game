/** Bot play and trick-collect waits. Bidding is not paced here. */
export type PlaySpeed = 'normal' | 'fast';

/** Target wait before the next bot card. Compute time is subtracted, never added. */
export function botPlayDelay(speed: PlaySpeed, locked: boolean): number {
  if (locked) return 150;
  return speed === 'fast' ? 200 : 400;
}

/** How long a finished trick stays on the table. */
export function trickPause(speed: PlaySpeed, locked: boolean): number {
  if (locked) return 250;
  return speed === 'fast' ? 350 : 700;
}

/**
 * Wait this long after the AI has already spent `elapsedMs`.
 * The player sees max(target, compute), not target plus compute.
 */
export function remainingDelay(targetMs: number, elapsedMs: number): number {
  return Math.max(0, targetMs - Math.max(0, elapsedMs));
}
