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
  const width = played.length >= 7 ? 36 : played.length >= 5 ? 44 : 56;
  return (
    <div className="rounded-xl bg-felt p-4 min-h-[150px] flex flex-col items-center justify-center gap-2">
      {ledSuit && (
        <div className="text-xs text-white/70 uppercase tracking-wider flex items-center gap-1">
          led: <SuitIcon suit={ledSuit} size={12} className="inline" />
        </div>
      )}
      {played.length === 0 ? (
        <div className="text-sm text-white/60">Trick area</div>
      ) : (
        <>
          <div className="flex w-full justify-center gap-0.5 overflow-hidden">
            {played.map((p, index) => (
              <div key={`${cardInstanceKey(p.card)}-${p.playerId}`} className={p.playerId === winnerId ? 'rounded-md ring-2 ring-[#E8A317]' : undefined}>
                <CardFace card={p.card} width={width} thirty={thirtyIndexes?.has(index) ?? false} />
              </div>
            ))}
          </div>
          <div className="text-xs text-white/80">
            {played.map((p) => playerNames[p.playerId] ?? p.playerId).join(' · ')}
          </div>
        </>
      )}
    </div>
  );
}
