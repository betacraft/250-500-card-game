/** Seat ids for a local table. The human is always `p1`. */
export function localSeatIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `p${index + 1}`);
}

/** Display names. Bots are numbered from the seat index. */
export function localNames(seats: string[], humanId: string, humanName: string): Record<string, string> {
  const names: Record<string, string> = {};
  seats.forEach((id, index) => {
    names[id] = id === humanId ? humanName : `Bot ${index + 1}`;
  });
  return names;
}

/** First player to this score ends a local game. Same convention as the scorekeeper default. */
export const DEFAULT_TARGET = 1000;

let testTarget: number | null = null;

/** Unit tests set a short target. Pass null to use the page or the default. */
export function setLocalTargetForTests(score: number | null): void {
  testTarget = score;
}

/**
 * Target for the next local game.
 * Dev builds honor `?target=` so a test can finish a game in a few hands.
 * Production always uses 1000.
 */
export function currentTarget(): number {
  if (testTarget !== null) return testTarget;
  if (!import.meta.env.DEV || typeof window === 'undefined') return DEFAULT_TARGET;
  try {
    const raw = new URLSearchParams(window.location.search).get('target');
    const parsed = raw === null ? Number.NaN : Number(raw);
    if (Number.isInteger(parsed) && parsed >= 1) return parsed;
  } catch {
    /* ignore a blocked location */
  }
  return DEFAULT_TARGET;
}
