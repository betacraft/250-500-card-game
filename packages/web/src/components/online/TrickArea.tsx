import { useEffect, useRef, useState } from 'react';
import type { Card, Suit } from '@250-500/shared';
import { cardInstanceKey, trickWinner } from '@250-500/shared';
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
  trump?: Suit | null;
  /** Short window: no tall minimum, so the played cards stay above the fan. */
  compact?: boolean;
}

/** Center-of-screen area showing cards played to the current trick + led suit. */
export function TrickArea({ played, playerNames, ledSuit, thirtyIndexes, winnerId = null, trump = null, compact = false }: TrickAreaProps): JSX.Element {
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
  const layout = trickLayout(played.length, rowWidth, compact);
  const rows = splitRows(played, layout.rows);
  const leaderId = trickLeader(played, winnerId, trump, ledSuit ?? null);
  return (
    <div className={compact ? 'flex flex-col items-center justify-center gap-0.5 rounded-xl bg-felt px-1 py-1' : 'flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl bg-felt px-1 py-3'}>
      {(ledSuit || leaderId) && (
        <div className="flex items-center gap-2 text-sm text-white/90">
          {ledSuit && <span data-testid="led-suit" data-suit={ledSuit} className="inline-flex items-center gap-1">Led: {ledSuit} <SuitIcon suit={ledSuit} size={18} badge /></span>}
          {leaderId && <span data-testid="trick-leader">Winning: {playerNames[leaderId] ?? leaderId}</span>}
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
                    <div key={`${cardInstanceKey(p.card)}-${p.playerId}`} data-testid={won ? 'trick-winner' : 'trick-card'} data-card-width={layout.width} className={`relative ${won ? 'rounded-md ring-4 ring-[#E8A317]' : ''}`}>
                      <CardFace card={p.card} width={layout.width} thirty={thirtyIndexes?.has(index) ?? false} />
                      <span data-testid="trick-seat" className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/60 text-center text-[10px] leading-3 text-white">{seatLabel(playerNames[p.playerId] ?? p.playerId)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function trickLeader(played: PlayedCardEntry[], winnerId: string | null, trump: Suit | null, led: Suit | null): string | null {
  if (winnerId) return winnerId;
  const suit = trump ?? led ?? played[0]?.card.suit;
  if (!suit) return null;
  return trickWinner(played, suit)?.playerId ?? null;
}

/** "Ada" becomes "A". "Bot 2" becomes "B2". */
function seatLabel(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? name;
  if (parts.length <= 1) return first.slice(0, 1);
  return `${first.slice(0, 1)}${parts.slice(1).join('')}`;
}

/** Eight-card tricks use two rows so each card stays at least 47px wide. */
function trickLayout(count: number, rowWidth: number, compact: boolean): { width: number; rows: number } {
  const cards = Math.max(count, 1);
  const single = Math.floor((rowWidth - 4) / cards);
  if (compact) return { width: Math.min(56, Math.max(36, single)), rows: 1 };
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
