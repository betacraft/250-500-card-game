import type { AnalyticsEvent } from './types';

const EVENTS_KEY = 'analytics_events';
const ANON_KEY = 'analytics_anon_id';
const VISIT_KEY = 'analytics_visit';
const FIRST_HAND_KEY = 'analytics_first_hand';
const MAX_EVENTS = 500;

/** In-memory copy of the localStorage ring. Empty when analytics is off. */
let memory: AnalyticsEvent[] = [];

/** Random UUID. Nothing about the device or the player is mixed in. */
export function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] ?? 0) & 0x0f | 0x40;
  bytes[8] = (bytes[8] ?? 0) & 0x3f | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Stable anonymous id for this browser profile. Created only while analytics is on. */
export function anonPlayerId(): string {
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const created = randomUuid();
    localStorage.setItem(ANON_KEY, created);
    return created;
  } catch {
    return 'anon-unavailable';
  }
}

export interface VisitRecord {
  count: number;
  last_ts: number;
}

/** Previous visit, if analytics stored one. */
export function readVisit(): VisitRecord | null {
  try {
    const raw = localStorage.getItem(VISIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VisitRecord>;
    if (typeof parsed.count !== 'number' || typeof parsed.last_ts !== 'number') return null;
    return { count: parsed.count, last_ts: parsed.last_ts };
  } catch {
    return null;
  }
}

/** Remember this visit so a later session can emit return_visit. */
export function writeVisit(record: VisitRecord): void {
  try {
    localStorage.setItem(VISIT_KEY, JSON.stringify(record));
  } catch {
    /* storage full or blocked */
  }
}

/** True the first time a hand finishes for this anonymous id. */
export function claimFirstHand(): boolean {
  try {
    if (localStorage.getItem(FIRST_HAND_KEY) === '1') return false;
    localStorage.setItem(FIRST_HAND_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

/** Load the ring from localStorage. Bad JSON becomes an empty buffer. */
export function loadEvents(): void {
  memory = [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    memory = parsed.slice(-MAX_EVENTS) as AnalyticsEvent[];
  } catch {
    memory = [];
  }
}

/** Append one event and keep the last 500 in memory and localStorage. */
export function rememberEvent(event: AnalyticsEvent): void {
  memory.push(event);
  if (memory.length > MAX_EVENTS) memory = memory.slice(-MAX_EVENTS);
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(memory));
  } catch {
    /* storage full or blocked */
  }
}

/** A copy of the ring. */
export function storedEvents(): AnalyticsEvent[] {
  return memory.slice();
}

/** Drop recorded events. The anonymous id and visit count stay. */
export function clearStoredEvents(): void {
  memory = [];
  try {
    localStorage.removeItem(EVENTS_KEY);
  } catch {
    /* ignore */
  }
}

/** Forget every analytics key. Tests use this so later cases stay off. */
export function clearAnalyticsStorage(): void {
  memory = [];
  try {
    localStorage.removeItem(EVENTS_KEY);
    localStorage.removeItem(ANON_KEY);
    localStorage.removeItem(VISIT_KEY);
    localStorage.removeItem(FIRST_HAND_KEY);
  } catch {
    /* ignore */
  }
}
