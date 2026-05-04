import { useState } from 'react';
import { clsx } from 'clsx';
import { type Card, cardId, suitColor } from '@250-500/shared';
import { SuitIcon } from '../shared/SuitIcon';

interface HandSliderProps {
  cards: Card[];
  legalCardIds?: Set<string>;
  onPlay: (card: Card) => void;
  alwaysConfirm?: boolean;
  canPlay: boolean;
}

/** Mobile horizontal snap-scroll hand display. Tap-to-select with lift; Play button confirms. */
export function HandSlider({ cards, legalCardIds, onPlay, alwaysConfirm = true, canPlay }: HandSliderProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = cards.find((c) => cardId(c) === selectedId) ?? null;

  const handleTap = (card: Card) => {
    if (!canPlay) return;
    const id = cardId(card);
    if (legalCardIds && !legalCardIds.has(id)) return;
    if (!alwaysConfirm) {
      onPlay(card);
      return;
    }
    setSelectedId(id);
  };

  return (
    <div className="rounded-xl bg-white p-2">
      <div className="flex justify-between items-center px-2 pb-2 text-xs text-stone-500">
        <span>Your hand · {cards.length} card{cards.length === 1 ? '' : 's'}</span>
        {canPlay && <span className="text-felt">your turn</span>}
      </div>
      <div className="flex gap-2 overflow-x-auto px-2 pb-2" style={{ scrollSnapType: 'x mandatory' }}>
        {cards.map((c) => {
          const id = cardId(c);
          const isSelected = selectedId === id;
          const isLegal = !legalCardIds || legalCardIds.has(id);
          const color = suitColor(c.suit);
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleTap(c)}
              aria-label={`${c.rank} of ${c.suit}`}
              aria-pressed={isSelected}
              className={clsx(
                'flex-shrink-0 flex h-[88px] w-[64px] flex-col items-center justify-center rounded-lg bg-white text-base font-medium transition-transform',
                isSelected ? 'border-2 border-gold-border ring-2 ring-gold -translate-y-2' : 'border border-stone-300',
                !isLegal && 'opacity-40',
                color === 'red' ? 'text-suit-red' : 'text-suit-black',
                'active:scale-95',
              )}
              style={{ scrollSnapAlign: 'start' }}
              disabled={!canPlay || !isLegal}
            >
              <span className="text-lg tabular-nums">{c.rank}</span>
              <SuitIcon suit={c.suit} size={20} />
            </button>
          );
        })}
      </div>
      {alwaysConfirm && selected && canPlay && (
        <button
          type="button"
          onClick={() => {
            onPlay(selected);
            setSelectedId(null);
          }}
          className="mt-2 w-[calc(100%-8px)] mx-1 rounded-xl bg-felt p-3 text-sm font-medium text-white active:scale-95 active:bg-felt-dark"
        >
          Play {selected.rank}
        </button>
      )}
    </div>
  );
}
