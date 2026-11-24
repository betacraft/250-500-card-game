import { exportAnalytics } from './inspector';

/** Downloads the local event log. Rendered only for `?debug=1`. */
export function ExportAnalyticsButton(): JSX.Element | null {
  if (typeof window === 'undefined') return null;
  let debug = false;
  try {
    debug = new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    debug = false;
  }
  if (!debug) return null;
  return (
    <button
      type="button"
      data-testid="export-analytics"
      onClick={downloadAnalytics}
      className="fixed left-2 top-2 z-50 min-h-11 rounded-xl bg-white px-3 text-sm font-medium text-stone-800 shadow"
    >
      Export analytics
    </button>
  );
}

function downloadAnalytics(): void {
  const json = exportAnalytics();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'analytics.json';
  link.click();
  URL.revokeObjectURL(url);
}
