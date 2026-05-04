import { Loader, RefreshCw } from 'lucide-react';

interface ReconnectionBannerProps {
  status: 'connecting' | 'disconnected' | 'error';
  onRetry: () => void;
}

export function ReconnectionBanner({ status: _status, onRetry }: ReconnectionBannerProps): JSX.Element {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-2 text-sm text-amber-900">
      <Loader size={16} className="animate-spin shrink-0" />
      <div className="flex-1">
        <div className="font-medium">Reconnecting…</div>
        <div className="text-xs">Game paused while we restore your connection.</div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium active:scale-95"
        aria-label="Retry connection"
      >
        <RefreshCw size={12} />
        Retry
      </button>
    </div>
  );
}
