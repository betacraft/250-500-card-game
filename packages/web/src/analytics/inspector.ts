import { isAnalyticsEnabled } from './flag';
import { bufferedEvents, clearSinks } from './track';
import { clearStoredEvents } from './storage';
import { sessionIdForInspector } from './session';

declare global {
  interface Window {
    __analytics?: AnalyticsInspector;
  }
}

export interface AnalyticsInspector {
  events: () => ReturnType<typeof bufferedEvents>;
  clear: () => void;
  export: () => string;
  sessionId: string | null;
}

/** JSON a playtest can read or download. No network. */
export function exportAnalytics(): string {
  const payload = {
    enabled: isAnalyticsEnabled(),
    session_id: sessionIdForInspector(),
    events: bufferedEvents(),
  };
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return '{"enabled":false,"session_id":null,"events":[]}';
  }
}

/** Attach the inspector. Safe to call when analytics is off. */
export function attachInspector(): void {
  if (typeof window === 'undefined') return;
  const api: AnalyticsInspector = {
    events: () => bufferedEvents(),
    clear: () => {
      if (!isAnalyticsEnabled()) return;
      clearStoredEvents();
    },
    export: () => exportAnalytics(),
    get sessionId(): string | null {
      return sessionIdForInspector();
    },
  };
  (window as Window & { __analytics?: AnalyticsInspector }).__analytics = api;
}

/** Drop the inspector reference in tests. */
export function detachInspector(): void {
  if (typeof window === 'undefined') return;
  delete (window as Window & { __analytics?: AnalyticsInspector }).__analytics;
  clearSinks();
}
