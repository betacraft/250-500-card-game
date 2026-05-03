import type { Suit } from '@250-500/shared';

interface SuitIconProps {
  suit: Suit;
  size?: number;
  className?: string;
}

const PATHS: Record<Suit, string> = {
  spades: 'M50 5 L88 50 Q88 80 65 80 Q55 80 50 75 Q45 80 35 80 Q12 80 12 50 Z M42 80 L42 95 L58 95 L58 80 Z',
  hearts: 'M50 90 Q12 50 30 20 Q40 10 50 30 Q60 10 70 20 Q88 50 50 90 Z',
  diamonds: 'M50 8 L88 50 L50 92 L12 50 Z',
  clubs: 'M50 8 Q35 8 35 23 Q35 32 42 36 Q22 30 22 50 Q22 65 38 65 Q45 65 50 60 Q55 65 62 65 Q78 65 78 50 Q78 30 58 36 Q65 32 65 23 Q65 8 50 8 Z M42 65 L42 92 L58 92 L58 65 Z',
};

const COLORS: Record<Suit, string> = {
  spades: '#222',
  clubs: '#222',
  hearts: '#B53132',
  diamonds: '#B53132',
};

/** Inline SVG suit icon — never Unicode (renders as emoji on some platforms). */
export function SuitIcon({ suit, size = 16, className }: SuitIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[suit]} fill={COLORS[suit]} />
    </svg>
  );
}
