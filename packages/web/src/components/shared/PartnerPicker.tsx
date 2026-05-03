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
      <div className="overflow-x-auto">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `28px repeat(${RANKS_ORDERED.length}, minmax(0, 1fr))` }}
        >
          <div></div>
          {RANKS_ORDERED.map((r) => (
            <div key={r} className="text-center text-[10px] font-medium text-stone-400 tabular-nums">
              {r}
            </div>
          ))}

          {SUITS_ORDERED.map((suit: Suit) => (
            <ContentForSuit key={suit} suit={suit} selected={selected} onToggle={toggle} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentForSuit({
  suit,
  selected,
  onToggle,
}: {
  suit: Suit;
  selected: Card[];
  onToggle: (card: Card) => void;
}): JSX.Element {
  return (
    <>
      <div className="flex items-center justify-center">
        <SuitIcon suit={suit} size={14} />
      </div>
      {RANKS_ORDERED.map((rank) => {
        const card: Card = { suit, rank };
        const sel = isSelected(card, selected);
        const color = suitColor(suit);
        return (
          <button
            key={cardId(card)}
            type="button"
            onClick={() => onToggle(card)}
            aria-pressed={sel}
            aria-label={`${rank} of ${suit}`}
            className={clsx(
              'h-9 rounded-md border text-xs font-medium tabular-nums transition-transform active:scale-95',
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
    </>
  );
}
