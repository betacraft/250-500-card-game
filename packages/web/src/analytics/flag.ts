/**
 * Soft-launch analytics ships off. `VITE_ANALYTICS_DEFAULT_ON=true` is Mayuresh's
 * deploy-time switch. With the default build, nothing is recorded until `?analytics=1`.
 */
export const ANALYTICS_ENABLED = false;

const FLAG = 'analytics_enabled';

/** True when this build should collect analytics before anyone opts in. */
export function analyticsDefaultOn(): boolean {
  return ANALYTICS_ENABLED || import.meta.env.VITE_ANALYTICS_DEFAULT_ON === 'true';
}

/**
 * Decide whether analytics is on, and what to store.
 * `?analytics=1` opts in. `?analytics=0` opts out. A build default of on stays on
 * until that opt-out is stored.
 */
export function resolveAnalytics(search: string, stored: string | null, defaultOn: boolean): { enabled: boolean; stored: string | null } {
  const query = new URLSearchParams(search).get('analytics');
  let next = stored;
  if (query === '1') next = '1';
  else if (query === '0') next = defaultOn ? '0' : null;
  const enabled = next === '1' || (defaultOn && next !== '0');
  return { enabled, stored: next };
}

/** Read the page and localStorage. Seeing `?analytics=1` or `0` updates the stored flag. */
export function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return analyticsDefaultOn();
  let stored: string | null = null;
  let search = '';
  try {
    search = window.location.search;
    stored = window.localStorage.getItem(FLAG);
  } catch {
    return analyticsDefaultOn();
  }
  const decision = resolveAnalytics(search, stored, analyticsDefaultOn());
  try {
    if (decision.stored === null) {
      if (stored !== null) window.localStorage.removeItem(FLAG);
    } else if (decision.stored !== stored) {
      window.localStorage.setItem(FLAG, decision.stored);
    }
  } catch {
    /* storage blocked */
  }
  return decision.enabled;
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
