import { isAnalyticsEnabled } from './flag';
import { readVisit, writeVisit } from './storage';
import { currentSessionId, setSessionId, track } from './track';
import { randomUuid } from './storage';

let startedAt = 0;
let ended = false;
let removeListeners: (() => void) | null = null;

/** Start one tab session. A later load with a stored visit also emits return_visit. */
export function startAnalyticsSession(): void {
  if (!isAnalyticsEnabled() || startedAt !== 0) return;
  startedAt = Date.now();
  ended = false;
  setSessionId(randomUuid());
  const previous = readVisit();
  const count = (previous?.count ?? 0) + 1;
  track('session_start', {});
  if (previous) {
    const days = Math.round((startedAt - previous.last_ts) / 86_400_000);
    track('return_visit', { days_since_last: days, visit_count: count });
  }
  writeVisit({ count, last_ts: startedAt });
  const onHide = (): void => endAnalyticsSession();
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      track('tab_hidden', {});
      track('pause', {});
      endAnalyticsSession();
      return;
    }
    track('tab_visible', {});
    track('resume', {});
  };
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', onVisibility);
  removeListeners = () => {
    window.removeEventListener('pagehide', onHide);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** Session length once, on pagehide or the first hide. Later hides do not emit again. */
export function endAnalyticsSession(): void {
  if (!isAnalyticsEnabled() || ended || startedAt === 0) return;
  ended = true;
  track('session_end', { session_length_ms: Date.now() - startedAt });
}

/** Detach listeners and allow a fresh session. Tests use this. */
export function resetAnalyticsSession(): void {
  removeListeners?.();
  removeListeners = null;
  startedAt = 0;
  ended = false;
  setSessionId('');
}

/** The id of the live tab session, or null when analytics is off. */
export function sessionIdForInspector(): string | null {
  if (!isAnalyticsEnabled()) return null;
  const id = currentSessionId();
  return id && id.length > 0 ? id : null;
}
