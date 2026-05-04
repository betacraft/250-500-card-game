import type { Card } from '@250-500/shared';
import { suitColor, cardId } from '@250-500/shared';
import { SuitIcon } from '../shared/SuitIcon';

interface PlayedCardEntry {
  playerId: string;
  card: Card;
}

interface TrickAreaProps {
  played: PlayedCardEntry[];
  playerNames: Record<string, string>;
  ledSuit?: Card['suit'] | null;
}

/** Center-of-screen area showing cards played to the current trick + led suit. */
export function TrickArea({ played, playerNames, ledSuit }: TrickAreaProps): JSX.Element {
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
          <div className="flex gap-2">
            {played.map((p) => {
              const c = p.card;
              const color = suitColor(c.suit);
              return (
                <div
                  key={cardId(c) + '-' + p.playerId}
                  className={`flex h-[68px] w-[48px] flex-col items-center justify-center rounded-md bg-white border border-stone-300 ${color === 'red' ? 'text-suit-red' : 'text-suit-black'}`}
                >
                  <span className="text-base font-medium tabular-nums">{c.rank}</span>
                  <SuitIcon suit={c.suit} size={18} />
                </div>
              );
            })}
          </div>
          <div className="text-xs text-white/80">
            {played.map((p) => playerNames[p.playerId] ?? p.playerId).join(' · ')}
          </div>
        </>
      )}
    </div>
  );
}
