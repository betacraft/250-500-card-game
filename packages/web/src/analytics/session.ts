import { isAnalyticsEnabled } from './flag';
import { readVisit, writeVisit } from './storage';
import { currentSessionId, setSessionId, track } from './track';
import { randomUuid } from './storage';

let live = false;
let ended = false;
let visibleMs = 0;
let segmentStart = 0;
let hiddenCount = 0;
let removeListeners: (() => void) | null = null;

function stamp(at: number): void {
  if (segmentStart === 0) return;
  visibleMs += Math.max(0, at - segmentStart);
  segmentStart = 0;
}

/** Start one tab session. A later load with a stored visit also emits return_visit. */
export function startAnalyticsSession(): void {
  if (!isAnalyticsEnabled() || live) return;
  const at = Date.now();
  live = true;
  ended = false;
  visibleMs = 0;
  hiddenCount = 0;
  segmentStart = at;
  setSessionId(randomUuid());
  const previous = readVisit();
  const count = (previous?.count ?? 0) + 1;
  track('session_start', {});
  if (previous) {
    const days = Math.round((at - previous.last_ts) / 86_400_000);
    track('return_visit', { days_since_last: days, visit_count: count });
  }
  writeVisit({ count, last_ts: at });
  const onPageHide = (): void => endAnalyticsSession();
  const onVisibility = (): void => {
    const now = Date.now();
    if (document.visibilityState === 'hidden') {
      stamp(now);
      hiddenCount += 1;
      track('tab_hidden', {});
      track('pause', {});
      return;
    }
    segmentStart = now;
    track('tab_visible', {});
    track('resume', {});
  };
  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', onVisibility);
  removeListeners = () => {
    window.removeEventListener('pagehide', onPageHide);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** Visible time so far, on pagehide only. Hiding the tab does not end the session. */
export function endAnalyticsSession(): void {
  if (!isAnalyticsEnabled() || ended || !live) return;
  stamp(Date.now());
  ended = true;
  track('session_end', { session_length_ms: visibleMs, hidden_count: hiddenCount });
}

/** Detach listeners and allow a fresh session. Tests use this. */
export function resetAnalyticsSession(): void {
  removeListeners?.();
  removeListeners = null;
  live = false;
  ended = false;
  visibleMs = 0;
  segmentStart = 0;
  hiddenCount = 0;
  setSessionId('');
}

/** The id of the live tab session, or null when analytics is off. */
export function sessionIdForInspector(): string | null {
  if (!isAnalyticsEnabled()) return null;
  const id = currentSessionId();
  return id && id.length > 0 ? id : null;
}
