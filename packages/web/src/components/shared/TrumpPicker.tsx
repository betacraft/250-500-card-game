import { clsx } from 'clsx';
import { type Suit, SUITS_ORDERED } from '@250-500/shared';
import { SuitIcon } from './SuitIcon';

interface TrumpPickerProps {
  /** Currently selected trump suit, or null if none */
  value: Suit | null;
  /** Called when the selection changes */
  onChange: (suit: Suit) => void;
  /** Four suits in one row, for a short window. */
  compact?: boolean;
}

const LABELS: Record<Suit, string> = {
  spades: 'Spades',
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
};

/** Four large suit buttons for picking trump. */
export function TrumpPicker({ value, onChange, compact = false }: TrumpPickerProps): JSX.Element {
  return (
    <div className={compact ? 'grid grid-cols-4 gap-2' : 'grid grid-cols-2 gap-3'}>
      {SUITS_ORDERED.map((suit) => {
        const selected = value === suit;
        return (
          <button
            key={suit}
            type="button"
            onClick={() => onChange(suit)}
            aria-pressed={selected}
            aria-label={`Trump: ${LABELS[suit]}`}
            className={clsx(
              'flex items-center justify-center transition-transform active:scale-95',
              compact ? 'min-h-11 flex-col gap-0.5 rounded-lg px-0.5 py-1' : 'flex-col gap-2 rounded-xl p-5',
              selected
                ? 'bg-gold ring-2 ring-gold-border'
                : 'bg-white ring-1 ring-stone-200',
            )}
          >
            <SuitIcon suit={suit} size={compact ? 22 : 36} className="shrink-0" />
            <span
              className={clsx(
                'text-sm font-medium',
                selected ? 'text-gold-dark' : 'text-stone-700',
              )}
            >
              {LABELS[suit]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
