import { isAnalyticsEnabled } from './flag';
import { attachInspector } from './inspector';
import { resetAnalyticsSession, startAnalyticsSession } from './session';
import { clearSinks, setSessionId } from './track';
import { clearAnalyticsStorage } from './storage';

export { ANALYTICS_ENABLED, isAnalyticsEnabled } from './flag';
export { track, setAnalyticsContext, registerSink, bufferedEvents } from './track';
export { exportAnalytics } from './inspector';
export type { AnalyticsEvent, Sink } from './types';

let installed = false;

/** Install the inspector and, when the flag is on, start the local session. */
export function installAnalytics(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  attachInspector();
  if (!isAnalyticsEnabled()) return;
  startAnalyticsSession();
}

/** Reset module state so a unit test can start clean. */
export function resetAnalyticsForTests(): void {
  installed = false;
  resetAnalyticsSession();
  clearSinks();
  setSessionId('');
  clearAnalyticsStorage();
  if (typeof window !== 'undefined') {
    delete (window as Window & { __analytics?: unknown }).__analytics;
  }
}
