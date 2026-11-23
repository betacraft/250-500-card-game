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
  /** Faces in the bidder's hand. Marked, and still selectable. */
  heldFaces?: ReadonlySet<string>;
  /** Tighter spacing. Wide windows put all 12 ranks on one row. */
  compact?: boolean;
  wide?: boolean;
}

function isSelected(card: Card, selected: Card[]): boolean {
  return selected.some((c) => c.suit === card.suit && c.rank === card.rank);
}

/** 4 suits × 12 ranks; tap to toggle up to maxCount.
 * Mobile layout: each suit gets two rows of 6 ranks (no horizontal scroll, ≥44px tap targets,
 * ≥8px adjacent spacing). Fits comfortably at 360px portrait. */
export function PartnerPicker({ selected, maxCount, onChange, heldFaces, compact = false, wide = false }: PartnerPickerProps): JSX.Element {
  const toggle = (card: Card) => {
    const exists = isSelected(card, selected);
    if (exists) {
      onChange(selected.filter((c) => !(c.suit === card.suit && c.rank === card.rank)));
    } else if (selected.length < maxCount) {
      onChange([...selected, card]);
    }
  };

  return (
    <div className={compact && wide ? 'rounded-xl bg-white px-2 py-0.5' : compact ? 'rounded-xl bg-white p-2' : 'rounded-xl bg-white p-3'}>
      <div className={compact && wide ? 'flex items-baseline justify-between gap-2' : compact ? 'mb-1 flex items-baseline justify-between gap-2' : 'mb-2 flex items-center justify-between'}>
        <div data-testid="held-legend" className={compact ? 'text-[13px] leading-snug text-stone-600' : 'text-sm font-medium text-stone-600'}>
          Tap to select. Grey marks a card in your hand.
        </div>
        <div className="shrink-0 text-sm font-medium tabular-nums">
          {selected.length} / {maxCount}
        </div>
      </div>
      <div data-testid="rank-grid" className={compact ? 'flex flex-col gap-0' : 'flex flex-col gap-3'}>
        {SUITS_ORDERED.map((suit: Suit) => (
          <SuitBlock key={suit} suit={suit} selected={selected} heldFaces={heldFaces} onToggle={toggle} compact={compact} wide={wide} />
        ))}
      </div>
    </div>
  );
}

function SuitBlock({
  suit,
  selected,
  heldFaces,
  onToggle,
  compact,
  wide,
}: {
  suit: Suit;
  selected: Card[];
  heldFaces?: ReadonlySet<string>;
  onToggle: (card: Card) => void;
  compact: boolean;
  wide: boolean;
}): JSX.Element {
  const color = suitColor(suit);
  const tight = compact && !wide;
  const ranks = tight ? [RANKS_ORDERED.slice(0, 6), RANKS_ORDERED.slice(6)] : [RANKS_ORDERED];
  return (
    <div className={tight ? 'flex flex-col gap-0.5' : undefined}>
      {!compact && (
        <div className="mb-1 flex items-center gap-1.5">
          <SuitIcon suit={suit} size={16} />
          <span className="text-sm font-medium capitalize text-stone-600">{suit}</span>
        </div>
      )}
      {ranks.map((row, rowIndex) => (
      <div key={rowIndex} className={clsx('grid', wide && compact ? 'grid-cols-[20px_repeat(12,minmax(0,1fr))] items-center gap-1' : tight && rowIndex === 0 ? 'grid-cols-[16px_repeat(6,minmax(0,1fr))] items-center gap-0.5' : compact ? 'grid-cols-6 gap-0.5' : 'grid-cols-6 gap-2')}>
        {compact && (wide || rowIndex === 0) && <SuitIcon suit={suit} size={14} />}
        {row.map((rank) => {
          const card: Card = { suit, rank };
          const sel = isSelected(card, selected);
          const held = heldFaces?.has(cardId(card)) ?? false;
          return (
            <button
              key={cardId(card)}
              type="button"
              onClick={() => onToggle(card)}
              aria-pressed={sel}
              aria-label={held ? `${rank} of ${suit}, in your hand` : `${rank} of ${suit}`}
              data-held={held ? 'true' : undefined}
              className={clsx(
                'rounded-md border text-sm font-medium tabular-nums transition-transform active:scale-95',
                compact ? 'h-[26px]' : 'h-11',
                sel
                  ? 'border-gold-border bg-gold text-gold-dark'
                  : held
                    ? 'border-stone-500 bg-stone-200'
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
      ))}
    </div>
  );
}
