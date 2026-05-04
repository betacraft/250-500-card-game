import { clsx } from 'clsx';
import {
  type Card,
  type Suit,
  cardId,
  suitColor,
  SUITS_ORDERED,
  RANKS_ORDERED,
} from '@250-500/shared';
import { SuitIcon } from './SuitIcon';

interface PartnerPickerProps {
  /** Currently selected cards */
  selected: Card[];
  /** Maximum cards that can be selected (2 for 250, 3 for 500) */
  maxCount: number;
  /** Called when selection changes */
  onChange: (cards: Card[]) => void;
}

function isSelected(card: Card, selected: Card[]): boolean {
  return selected.some((c) => c.suit === card.suit && c.rank === card.rank);
}

/** 4 suits × 12 ranks; tap to toggle up to maxCount.
 * Mobile layout: each suit gets two rows of 6 ranks (no horizontal scroll, ≥44px tap targets,
 * ≥8px adjacent spacing). Fits comfortably at 360px portrait. */
export function PartnerPicker({ selected, maxCount, onChange }: PartnerPickerProps): JSX.Element {
  const toggle = (card: Card) => {
    const exists = isSelected(card, selected);
    if (exists) {
      onChange(selected.filter((c) => !(c.suit === card.suit && c.rank === card.rank)));
    } else if (selected.length < maxCount) {
      onChange([...selected, card]);
    }
  };

  return (
    <div className="rounded-xl bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Tap to select
        </div>
        <div className="text-sm font-medium tabular-nums">
          {selected.length} / {maxCount}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {SUITS_ORDERED.map((suit: Suit) => (
          <SuitBlock key={suit} suit={suit} selected={selected} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}

function SuitBlock({
  suit,
  selected,
  onToggle,
}: {
  suit: Suit;
  selected: Card[];
  onToggle: (card: Card) => void;
}): JSX.Element {
  const color = suitColor(suit);
  // Split 12 ranks into 2 rows of 6
  const rowA = RANKS_ORDERED.slice(0, 6);
  const rowB = RANKS_ORDERED.slice(6);
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <SuitIcon suit={suit} size={16} />
        <span className="text-xs font-medium capitalize text-stone-600">{suit}</span>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {[...rowA, ...rowB].map((rank) => {
          const card: Card = { suit, rank };
          const sel = isSelected(card, selected);
          return (
            <button
              key={cardId(card)}
              type="button"
              onClick={() => onToggle(card)}
              aria-pressed={sel}
              aria-label={`${rank} of ${suit}`}
              className={clsx(
                'h-11 rounded-md border text-sm font-medium tabular-nums transition-transform active:scale-95',
                sel
                  ? 'border-gold-border bg-gold text-gold-dark'
                  : 'border-stone-200 bg-white',
                !sel && color === 'red' && 'text-suit-red',
                !sel && color === 'black' && 'text-suit-black',
              )}
            >
              {rank}
            </button>
          );
        })}
      </div>
    </div>
  );
}
