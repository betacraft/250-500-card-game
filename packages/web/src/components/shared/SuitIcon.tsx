import type { Suit } from '@250-500/shared';
import { SUIT_BADGE, SUIT_FILL, SUIT_NAME, SUIT_PIP } from '../cards/suit-glyphs';

interface SuitIconProps {
  suit: Suit;
  size?: number;
  className?: string;
  /** Cream badge, for a pip sitting on felt or another dark ground. */
  badge?: boolean;
}

/** The card pip, large enough to read at header size. */
export function SuitIcon({ suit, size = 18, className, badge = false }: SuitIconProps): JSX.Element {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      className={badge ? undefined : className}
      role="img"
      aria-label={SUIT_NAME[suit]}
    >
      <path d={SUIT_PIP[suit]} fill={SUIT_FILL[suit]} />
    </svg>
  );
  if (!badge) return icon;
  const pad = Math.max(2, Math.round(size * 0.18));
  return (
    <span
      data-icon-badge=""
      className={`inline-flex shrink-0 items-center justify-center rounded-md ${className ?? ''}`}
      style={{ backgroundColor: SUIT_BADGE, padding: pad }}
    >
      {icon}
    </span>
  );
}
