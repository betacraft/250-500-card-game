/**
 * Soft-launch analytics is off unless this constant, `?analytics=1`, or
 * localStorage `analytics_enabled` = `1` turns it on. The constant ships false.
 */
export const ANALYTICS_ENABLED = false;

/** True only when the owner flag, the query, or localStorage asks for analytics. */
export function isAnalyticsEnabled(): boolean {
  if (ANALYTICS_ENABLED) return true;
  if (typeof window === 'undefined') return false;
  try {
    const search = new URLSearchParams(window.location.search).get('analytics');
    if (search === '1') return true;
    return window.localStorage.getItem('analytics_enabled') === '1';
  } catch {
    return false;
  }
}

/** Console mirror for local debugging. Still requires analytics to be enabled. */
export function isAnalyticsDebug(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('debug') === '1') return true;
  } catch {
    return false;
  }
  return import.meta.env.DEV === true && import.meta.env.MODE !== 'test';
}
