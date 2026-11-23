import { useEffect, useRef, useState } from 'react';
import type { Card } from '@250-500/shared';
import { cardInstanceKey } from '@250-500/shared';
import { SuitIcon } from '../shared/SuitIcon';
import { CardFace } from '../cards/CardFace';

interface PlayedCardEntry {
  playerId: string;
  card: Card;
}

interface TrickAreaProps {
  played: PlayedCardEntry[];
  playerNames: Record<string, string>;
  ledSuit?: Card['suit'] | null;
  /** Indexes in `played` that are the first scoring 3 of their suit. */
  thirtyIndexes?: ReadonlySet<number>;
  winnerId?: string | null;
}

/** Center-of-screen area showing cards played to the current trick + led suit. */
export function TrickArea({ played, playerNames, ledSuit, thirtyIndexes, winnerId = null }: TrickAreaProps): JSX.Element {
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState(360);
  useEffect(() => {
    const node = rowRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const apply = (): void => setRowWidth(node.clientWidth);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const count = Math.max(played.length, 1);
  const width = Math.min(72, Math.max(48, Math.floor((rowWidth - 4) / count)));
  return (
    <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl bg-felt px-1 py-3">
      {ledSuit && (
        <div className="flex items-center gap-1 text-sm uppercase tracking-wider text-white/70">
          led: <SuitIcon suit={ledSuit} size={14} className="inline" />
        </div>
      )}
      {played.length === 0 ? (
        <div className="text-sm text-white/60">Trick area</div>
      ) : (
        <>
          <div ref={rowRef} className="-mx-3 flex w-[calc(100%+1.5rem)] justify-center">
            {played.map((p, index) => (
              <div key={`${cardInstanceKey(p.card)}-${p.playerId}`} className={p.playerId === winnerId ? 'rounded-md ring-2 ring-[#E8A317]' : undefined}>
                <CardFace card={p.card} width={width} thirty={thirtyIndexes?.has(index) ?? false} />
              </div>
            ))}
          </div>
          <div className="text-sm text-white/80">
            {played.map((p) => playerNames[p.playerId] ?? p.playerId).join(' · ')}
          </div>
        </>
      )}
    </div>
  );
}
