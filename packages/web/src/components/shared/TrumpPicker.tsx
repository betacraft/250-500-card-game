import { clsx } from 'clsx';
import { type Suit, SUITS_ORDERED } from '@250-500/shared';
import { SuitIcon } from './SuitIcon';

interface TrumpPickerProps {
  /** Currently selected trump suit, or null if none */
  value: Suit | null;
  /** Called when the selection changes */
  onChange: (suit: Suit) => void;
}

const LABELS: Record<Suit, string> = {
  spades: 'Spades',
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
};

/** Four large suit buttons for picking trump. */
export function TrumpPicker({ value, onChange }: TrumpPickerProps): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SUITS_ORDERED.map((suit) => {
        const selected = value === suit;
        return (
          <button
            key={suit}
            type="button"
            onClick={() => onChange(suit)}
            aria-pressed={selected}
            aria-label={`Trump ${LABELS[suit]}`}
            className={clsx(
              'flex flex-col items-center gap-2 rounded-xl p-5 transition-transform active:scale-95',
              selected
                ? 'bg-gold ring-2 ring-gold-border'
                : 'bg-white ring-1 ring-stone-200',
            )}
          >
            <SuitIcon suit={suit} size={36} />
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
