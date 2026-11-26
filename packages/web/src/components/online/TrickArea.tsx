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
  /** Drop the 150px floor so Finish can sit under the status line. */
  flush?: boolean;
  /** Fill the space above the dock and keep the led-suit line. */
  bounded?: boolean;
}

/** Center-of-screen area showing cards played to the current trick + led suit. */
export function TrickArea({ played, playerNames, ledSuit, thirtyIndexes, winnerId = null, trump = null, compact = false, flush = false, bounded = false }: TrickAreaProps): JSX.Element {
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
  const leaderId = trickLeader(played, winnerId, trump, ledSuit ?? null);
  return (
    <div data-testid="trick-area" className={bounded ? 'flex h-full max-h-full min-h-0 flex-col items-center justify-start gap-0.5 overflow-hidden rounded-xl bg-felt px-1 py-1' : compact || flush ? 'flex flex-col items-center justify-center gap-0.5 rounded-xl bg-felt px-1 py-1' : 'flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl bg-felt px-1 py-3'}>
      {(ledSuit || leaderId) && (
        <div className="flex items-center gap-2 text-sm text-white/90">
          {ledSuit && <span data-testid="led-suit" data-suit={ledSuit} className="inline-flex items-center gap-1">Led: {ledSuit} <SuitIcon suit={ledSuit} size={18} badge /></span>}
          {leaderId && <span data-testid="trick-leader">Winning: {seatLabel(playerNames[leaderId] ?? leaderId)}</span>}
        </div>
      )}
      {played.length === 0 ? (
        <div className="text-sm text-white/60">Trick area</div>
      ) : (
        <>
          <div ref={rowRef} data-testid="trick-row" className="flex w-full justify-center">
            <div className="flex" style={{ width: layout.width + Math.max(played.length - 1, 0) * layout.step }}>
              {played.map((p, index) => {
                const won = p.playerId === winnerId;
                const labelWidth = index === played.length - 1 ? layout.width : layout.step;
                return (
                  <div key={`${cardInstanceKey(p.card)}-${p.playerId}`} data-testid={won ? 'trick-winner' : 'trick-card'} data-card-width={layout.width} className={`relative ${won ? 'rounded-md ring-4 ring-[#E8A317]' : ''}`} style={{ width: layout.width, marginLeft: index === 0 ? 0 : layout.step - layout.width, zIndex: index + 1 }}>
                    <CardFace card={p.card} width={layout.width} thirty={thirtyIndexes?.has(index) ?? false} />
                    <span data-testid="trick-seat" className="absolute bottom-0 left-0 truncate bg-black/70 text-center text-[10px] leading-[12px] text-white" style={{ width: labelWidth }}>{seatLabel(playerNames[p.playerId] ?? p.playerId)}</span>
                  </div>
                );
              })}
            </div>
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

/**
 * One row. Narrow tricks overlap about 58% so the rank corner and the seat
 * label stay in the visible left of each card. Later plays sit on top.
 */
function trickLayout(count: number, rowWidth: number, compact: boolean): { width: number; step: number } {
  const cards = Math.max(count, 1);
  const inner = Math.max(rowWidth - 4, 48);
  const cap = compact ? 56 : 76;
  const side = Math.floor(inner / cards);
  if (cards === 1 || side >= 56) {
    const width = Math.min(cap, Math.max(44, side));
    return { width, step: width };
  }
  const visible = 0.42;
  let width = Math.min(cap, Math.max(64, Math.floor(inner / (1 + (cards - 1) * visible))));
  let step = Math.round(width * visible);
  while (width > 48 && width + (cards - 1) * step > inner) {
    width -= 1;
    step = Math.max(28, Math.round(width * visible));
  }
  return { width, step };
}
