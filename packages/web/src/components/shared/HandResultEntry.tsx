import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { type Player, type GameType, scoreHand } from '@250-500/shared';

interface HandResultEntryProps {
  /** All players in the game */
  players: Player[];
  /** Game type */
  gameType: GameType;
  /** Bidder ID */
  bidder: string;
  /** Bid amount */
  bidAmount: number;
  /** Called when the result is applied */
  onApply: (bidMade: boolean, partners: string[]) => void;
}

/** Mobile-friendly result entry: Made/Failed + partner pills + live preview. */
export function HandResultEntry({
  players,
  gameType,
  bidder,
  bidAmount,
  onApply,
}: HandResultEntryProps): JSX.Element {
  const [bidMade, setBidMade] = useState<boolean | null>(null);
  const [partners, setPartners] = useState<Set<string>>(new Set());

  const togglePartner = (id: string) => {
    setPartners((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const preview = useMemo(() => {
    if (bidMade === null) return null;
    return scoreHand({
      gameType,
      allPlayerIds: players.map((p) => p.id),
      bidder,
      bidAmount,
      partners: Array.from(partners),
      bidMade,
    });
  }, [bidMade, partners, gameType, players, bidder, bidAmount]);

  const nonBidders = players.filter((p) => p.id !== bidder);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl bg-white p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Did the bidder team make {bidAmount}?
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setBidMade(true)}
            className={clsx(
              'rounded-xl p-4 text-base font-medium transition-transform active:scale-95',
              bidMade === true
                ? 'bg-felt text-white'
                : 'border border-stone-300 bg-white text-stone-700',
            )}
          >
            Made it
          </button>
          <button
            type="button"
            onClick={() => setBidMade(false)}
            className={clsx(
              'rounded-xl p-4 text-base font-medium transition-transform active:scale-95',
              bidMade === false
                ? 'bg-red-600 text-white'
                : 'border border-stone-300 bg-white text-stone-700',
            )}
          >
            Failed
          </button>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Who came out as partners?
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {nonBidders.map((p) => {
            const sel = partners.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePartner(p.id)}
                aria-pressed={sel}
                className={clsx(
                  'rounded-full px-4 py-2 text-sm font-medium transition-transform active:scale-95',
                  sel
                    ? 'bg-gold text-gold-dark ring-1 ring-gold-border'
                    : 'border border-stone-300 bg-white text-stone-700',
                )}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </section>

      {preview && (
        <section
          className={clsx(
            'rounded-xl p-4 ring-1',
            bidMade ? 'bg-emerald-50 ring-emerald-200' : 'bg-red-50 ring-red-200',
          )}
        >
          <div
            className={clsx(
              'text-xs font-medium uppercase tracking-wider',
              bidMade ? 'text-felt' : 'text-red-700',
            )}
          >
            Score preview
          </div>
          <div className="mt-2 flex flex-col gap-1.5 text-sm">
            {players.map((p) => {
              const delta = preview.deltas[p.id] ?? 0;
              const isBidder = p.id === bidder;
              const isPartner = partners.has(p.id);
              return (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-stone-700">
                    {p.name}
                    {isBidder && <span className="ml-1 text-xs text-stone-500">(bidder)</span>}
                    {isPartner && <span className="ml-1 text-xs text-stone-500">(partner)</span>}
                  </span>
                  <span
                    className={clsx(
                      'font-medium tabular-nums',
                      delta > 0 ? 'text-felt' : delta < 0 ? 'text-red-700' : 'text-stone-400',
                    )}
                  >
                    {delta > 0 ? '+' : ''}
                    {delta}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => bidMade !== null && onApply(bidMade, Array.from(partners))}
        disabled={bidMade === null}
        className="w-full rounded-xl bg-felt p-4 text-base font-medium text-white shadow-sm transition active:scale-95 active:bg-felt-dark disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
      >
        Apply scores · next hand
      </button>
    </div>
  );
}
