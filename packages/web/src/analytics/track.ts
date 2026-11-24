import { BUILD_HASH, viewportClass } from './build';
import { isAnalyticsDebug, isAnalyticsEnabled } from './flag';
import { anonPlayerId, loadEvents, rememberEvent, storedEvents } from './storage';
import type { AnalyticsContext, AnalyticsEvent, AnalyticsValue, Sink } from './types';

const sinks: Sink[] = [];
let context: AnalyticsContext = { game: null, mode: null, difficulty: null };
let sessionIdValue: string | null = null;
let bufferReady = false;

/** Replace the table fields copied onto later events. */
export function setAnalyticsContext(next: Partial<AnalyticsContext>): void {
  context = { ...context, ...next };
}

/** Current table fields. */
export function analyticsContext(): AnalyticsContext {
  return { ...context };
}

/** Per-tab id. Null until a session starts with analytics on. */
export function currentSessionId(): string | null {
  return sessionIdValue;
}

/** Remember the id for this tab. */
export function setSessionId(id: string): void {
  sessionIdValue = id;
}

/** Add a sink. Later events are copied to it. */
export function registerSink(sink: Sink): void {
  sinks.push(sink);
}

/** Drop sinks. Tests call this between cases. */
export function clearSinks(): void {
  sinks.length = 0;
  bufferReady = false;
}

/** Record one event. A no-op, with no storage write, when analytics is off. */
export function track(name: string, props: Record<string, AnalyticsValue> = {}): void {
  if (!isAnalyticsEnabled()) return;
  try {
    ensureBuffer();
    const event = buildEvent(name, props);
    for (const sink of sinks) {
      try {
        sink.write(event);
      } catch {
        /* one sink cannot break play or the others */
      }
    }
  } catch {
    /* analytics must never throw into gameplay */
  }
}

function ensureBuffer(): void {
  if (bufferReady) return;
  bufferReady = true;
  loadEvents();
  registerSink({
    write(event: AnalyticsEvent): void {
      rememberEvent(event);
    },
  });
  if (isAnalyticsDebug()) {
    registerSink({
      write(event: AnalyticsEvent): void {
        console.info('[analytics]', event.name, event);
      },
    });
  }
}

function buildEvent(name: string, props: Record<string, AnalyticsValue>): AnalyticsEvent {
  const width = typeof window === 'undefined' ? 0 : window.innerWidth;
  return {
    name,
    ts: Date.now(),
    session_id: sessionIdValue && sessionIdValue.length > 0 ? sessionIdValue : 'no-session',
    anon_player_id: anonPlayerId(),
    game: context.game,
    mode: context.mode,
    difficulty: context.difficulty,
    build: BUILD_HASH,
    viewport: viewportClass(width),
    props: { ...props },
  };
}

/** Events currently in the ring. Empty when analytics is off. */
export function bufferedEvents(): AnalyticsEvent[] {
  if (!isAnalyticsEnabled()) return [];
  return storedEvents();
}
