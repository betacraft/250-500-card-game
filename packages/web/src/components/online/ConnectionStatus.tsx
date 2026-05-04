import { Wifi, WifiOff, Loader } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
}

/** Connection status pill: online / connecting / disconnected. */
export function ConnectionStatus({ status }: ConnectionStatusProps): JSX.Element {
  if (status === 'connected') {
    return (
      <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800">
        <Wifi size={12} />
        <span>online</span>
      </div>
    );
  }
  if (status === 'connecting' || status === 'idle') {
    return (
      <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
        <Loader size={12} className="animate-spin" />
        <span>connecting</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
      <WifiOff size={12} />
      <span>{status}</span>
    </div>
  );
}
