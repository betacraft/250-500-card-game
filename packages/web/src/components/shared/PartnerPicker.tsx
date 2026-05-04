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

/** 4 suit rows × 12 rank columns; tap to toggle selection up to maxCount. */
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
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
          Tap to select
        </div>
        <div className="text-sm font-medium tabular-nums">
          {selected.length} / {maxCount}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {SUITS_ORDERED.map((suit: Suit) => (
          <SuitRow key={suit} suit={suit} selected={selected} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}

function SuitRow({
  suit,
  selected,
  onToggle,
}: {
  suit: Suit;
  selected: Card[];
  onToggle: (card: Card) => void;
}): JSX.Element {
  const color = suitColor(suit);
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-11 w-8 shrink-0 items-center justify-center">
        <SuitIcon suit={suit} size={20} />
      </div>
      <div className="flex flex-1 gap-1.5 overflow-x-auto">
        {RANKS_ORDERED.map((rank) => {
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
                'h-11 min-w-[44px] shrink-0 rounded-md border px-2 text-sm font-medium tabular-nums transition-transform active:scale-95',
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
