import { Loader, RefreshCw } from 'lucide-react';

interface ReconnectionBannerProps {
  status: 'connecting' | 'disconnected' | 'error';
  onRetry: () => void;
}

/** Banner shown when the socket is not connected during gameplay.
 * Disabled action buttons elsewhere in the UI; this gives the user a manual retry. */
export function ReconnectionBanner({ status, onRetry }: ReconnectionBannerProps): JSX.Element {
  const message =
    status === 'connecting'
      ? 'Reconnecting…'
      : status === 'disconnected'
        ? 'Disconnected from server'
        : 'Connection error';
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-3">
      <Loader size={18} className="animate-spin shrink-0 text-amber-700" aria-hidden="true" />
      <div className="flex-1 text-sm text-amber-900">
        <div className="font-medium">{message}</div>
        <div className="text-xs">Game paused while we restore your connection.</div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex h-11 min-w-[44px] items-center justify-center gap-1 rounded-lg border border-amber-300 px-3 text-sm font-medium text-amber-900 active:scale-95"
        aria-label="Retry connection"
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}
