import { logger } from '../logger';

interface Bucket {
  events: number[];
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 1_000;
const MAX_PER_SECOND = 10;
const ABUSE_THRESHOLD_PER_SECOND = 50;

/** Returns true if event should be processed; false if rate-limited (drop). */
export function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  let bucket = buckets.get(socketId);
  if (!bucket) {
    bucket = { events: [] };
    buckets.set(socketId, bucket);
  }
  bucket.events = bucket.events.filter((t) => now - t < WINDOW_MS);
  bucket.events.push(now);
  if (bucket.events.length > ABUSE_THRESHOLD_PER_SECOND) {
    logger.warn({ socketId, eventsInWindow: bucket.events.length }, 'rate-limit abuse');
    return false;
  }
  if (bucket.events.length > MAX_PER_SECOND) {
    return false;
  }
  return true;
}

/** Clear the rate-limit bucket for a given socket (call on disconnect). */
export function clearRateLimit(socketId: string): void {
  buckets.delete(socketId);
}
