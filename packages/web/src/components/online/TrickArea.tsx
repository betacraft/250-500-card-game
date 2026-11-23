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
  }, [played.length]);
  const layout = trickLayout(played.length, rowWidth);
  const rows = splitRows(played, layout.rows);
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
          <div ref={rowRef} data-testid="trick-row" className="flex w-full flex-col items-center gap-1">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center">
                {row.map((p) => {
                  const index = played.indexOf(p);
                  const won = p.playerId === winnerId;
                  return (
                    <div key={`${cardInstanceKey(p.card)}-${p.playerId}`} data-testid={won ? 'trick-winner' : 'trick-card'} data-card-width={layout.width} className={won ? 'rounded-md ring-4 ring-[#E8A317]' : undefined}>
                      <CardFace card={p.card} width={layout.width} thirty={thirtyIndexes?.has(index) ?? false} />
                    </div>
                  );
                })}
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

/** Eight-card tricks use two rows so each card stays at least 47px wide. */
function trickLayout(count: number, rowWidth: number): { width: number; rows: number } {
  const cards = Math.max(count, 1);
  const single = Math.floor((rowWidth - 4) / cards);
  if (cards >= 8 && single < 47) {
    const perRow = Math.ceil(cards / 2);
    return { width: Math.min(72, Math.max(47, Math.floor((rowWidth - 8) / perRow))), rows: 2 };
  }
  return { width: Math.min(72, Math.max(28, single)), rows: 1 };
}

function splitRows<T>(items: T[], rows: number): T[][] {
  if (rows <= 1) return [items];
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}
