import type { Suit } from '@250-500/shared';
import { SuitIcon } from '../shared/SuitIcon';

interface TopStateStripProps {
  trump: Suit | null;
  bid: number | null;
  bidderName: string | null;
  yourScore: number;
}

export function TopStateStrip({ trump, bid, bidderName, yourScore }: TopStateStripProps): JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <div className="rounded-lg bg-white p-2">
        <div className="text-[10px] text-stone-500">Trump</div>
        <div className="mt-0.5 flex items-center gap-1">
          {trump ? <SuitIcon suit={trump} size={14} /> : <span className="text-stone-400">—</span>}
          <span className="capitalize">{trump ?? ''}</span>
        </div>
      </div>
      <div className="rounded-lg bg-white p-2">
        <div className="text-[10px] text-stone-500">Bid</div>
        <div className="mt-0.5">
          {bid !== null ? (
            <>
              <span className="font-medium tabular-nums">{bid}</span>{' '}
              <span className="text-stone-500">· {bidderName}</span>
            </>
          ) : (
            <span className="text-stone-400">—</span>
          )}
        </div>
      </div>
      <div className="rounded-lg bg-white p-2">
        <div className="text-[10px] text-stone-500">Your score</div>
        <div className="mt-0.5 font-medium tabular-nums">{yourScore}</div>
      </div>
    </div>
  );
}
