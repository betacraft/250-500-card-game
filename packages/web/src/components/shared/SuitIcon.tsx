import type { Suit } from '@250-500/shared';
import { SUIT_FILL, SUIT_NAME, SUIT_PIP } from '../cards/suit-glyphs';

interface SuitIconProps {
  suit: Suit;
  size?: number;
  className?: string;
}

/** The card pip, large enough to read at header size. */
export function SuitIcon({ suit, size = 18, className }: SuitIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      className={className}
      role="img"
      aria-label={SUIT_NAME[suit]}
    >
      <path d={SUIT_PIP[suit]} fill={SUIT_FILL[suit]} />
    </svg>
  );
}
