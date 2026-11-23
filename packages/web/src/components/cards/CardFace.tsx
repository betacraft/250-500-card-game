import type { Card, Suit } from '@250-500/shared';
import { SUIT_FILL, SUIT_PIP } from './suit-glyphs';

/** Normalized pip spots. The third value flips the pip. */
const PIPS: Record<string, ReadonlyArray<readonly [number, number, boolean]>> = {
  A: [[0.5, 0.5, false]],
  '3': [[0.5, 0.16, false], [0.5, 0.5, false], [0.5, 0.84, true]],
  '4': [[0.28, 0.2, false], [0.72, 0.2, false], [0.28, 0.8, true], [0.72, 0.8, true]],
  '5': [[0.28, 0.2, false], [0.72, 0.2, false], [0.5, 0.5, false], [0.28, 0.8, true], [0.72, 0.8, true]],
  '6': [[0.28, 0.18, false], [0.72, 0.18, false], [0.28, 0.5, false], [0.72, 0.5, false], [0.28, 0.82, true], [0.72, 0.82, true]],
  '7': [[0.28, 0.16, false], [0.72, 0.16, false], [0.5, 0.34, false], [0.28, 0.52, false], [0.72, 0.52, false], [0.28, 0.84, true], [0.72, 0.84, true]],
  '8': [[0.28, 0.15, false], [0.72, 0.15, false], [0.28, 0.38, false], [0.72, 0.38, false], [0.28, 0.62, true], [0.72, 0.62, true], [0.28, 0.85, true], [0.72, 0.85, true]],
  '9': [[0.28, 0.14, false], [0.72, 0.14, false], [0.28, 0.36, false], [0.72, 0.36, false], [0.5, 0.5, false], [0.28, 0.64, true], [0.72, 0.64, true], [0.28, 0.86, true], [0.72, 0.86, true]],
  '10': [[0.28, 0.13, false], [0.72, 0.13, false], [0.5, 0.28, false], [0.28, 0.4, false], [0.72, 0.4, false], [0.28, 0.6, true], [0.72, 0.6, true], [0.5, 0.72, true], [0.28, 0.87, true], [0.72, 0.87, true]],
};

interface CardFaceProps {
  card: Card;
  width?: number;
  selected?: boolean;
  playable?: boolean;
  disabled?: boolean;
  trump?: boolean;
  called?: boolean;
  /** This physical card is the first scoring 3 of its suit. */
  thirty?: boolean;
}

/** Code-drawn face. viewBox 250×350, stock #FFFDF7, four-colour suits. */
export function CardFace({
  card,
  width = 108,
  selected = false,
  playable = false,
  disabled = false,
  trump = false,
  called = false,
  thirty = false,
}: CardFaceProps): JSX.Element {
  const height = width * 1.4;
  const color = SUIT_FILL[card.suit];
  const court = card.rank === 'K' || card.rank === 'Q' || card.rank === 'J';
  return (
    <svg
      viewBox="0 0 250 350"
      width={width}
      height={height}
      aria-hidden="true"
      data-suit={card.suit}
      data-rank={card.rank}
      style={{ opacity: disabled ? 0.78 : 1 }}
    >
      <rect x="2" y="2" width="246" height="346" rx="16" fill="#FFFDF7" stroke="#1C1C24" strokeWidth="3.2" />
      {selected && <rect x="8" y="8" width="234" height="334" rx="12" fill="none" stroke="#E8A317" strokeWidth="7" />}
      {playable && !selected && <rect x="10" y="10" width="230" height="330" rx="12" fill="none" stroke="#0F766E" strokeWidth="4" />}
      {called && <rect x="12" y="12" width="226" height="326" rx="12" fill="none" stroke="#E8A317" strokeWidth="3" strokeDasharray="8 6" />}
      {trump && <TrumpTicks />}
      <Index rank={card.rank} suit={card.suit} color={color} testId="card-index" />
      <g transform="translate(222 308) rotate(180)">
        <Index rank={card.rank} suit={card.suit} color={color} />
      </g>
      {court ? <Court rank={card.rank} suit={card.suit} color={color} /> : <PipField suit={card.suit} rank={card.rank} />}
      {thirty && (
        <g data-testid="thirty-marker">
          <rect x="158" y="300" width="58" height="26" rx="8" fill="#9A3412" />
          <text x="187" y="319" textAnchor="middle" fill="#FFFDF7" fontFamily="Anton, Impact, sans-serif" fontSize="16">30</text>
        </g>
      )}
    </svg>
  );
}

function Index({ rank, suit, color, testId }: { rank: string; suit: Suit; color: string; testId?: string }): JSX.Element {
  return (
    <g data-testid={testId}>
      <text x="28" y="42" fill={color} fontFamily="Anton, Impact, sans-serif" fontSize={rank === '10' ? 32 : 36} textAnchor="middle">
        {rank}
      </text>
      <SuitGlyph suit={suit} x={17} y={50} size={22} />
    </g>
  );
}

function SuitGlyph({ suit, x, y, size }: { suit: Suit; x: number; y: number; size: number }): JSX.Element {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 22})`}>
      <path d={SUIT_PIP[suit]} fill={SUIT_FILL[suit]} />
    </g>
  );
}

function PipField({ suit, rank }: { suit: Suit; rank: string }): JSX.Element {
  const spots = PIPS[rank] ?? PIPS.A ?? [];
  const size = rank === 'A' ? 78 : 32;
  return (
    <g>
      {spots.map(([nx, ny, flip], index) => {
        const x = 50 + (nx ?? 0) * 150;
        const y = 78 + (ny ?? 0) * 200;
        return (
          <g key={index} transform={flip ? `rotate(180 ${x} ${y})` : undefined}>
            <SuitGlyph suit={suit} x={x - size / 2} y={y - size / 2} size={size} />
          </g>
        );
      })}
    </g>
  );
}

function Court({ rank, suit, color }: { rank: string; suit: Suit; color: string }): JSX.Element {
  return (
    <g>
      <rect x="68" y="88" width="114" height="174" rx="14" fill="none" stroke={color} strokeWidth="3" />
      {rank === 'K' && <path d="M88 118 L104 96 L125 116 L146 96 L162 118" fill="none" stroke={color} strokeWidth="4" />}
      {rank === 'Q' && <path d="M96 116 L112 98 L125 112 L138 98 L154 116" fill="none" stroke={color} strokeWidth="4" />}
      {rank === 'J' && <path d="M108 100 H142 V112 H130 V140 H120 V112 H108 Z" fill={color} />}
      <text x="125" y="190" textAnchor="middle" fill={color} fontFamily="Anton, Impact, sans-serif" fontSize="64">{rank}</text>
      <SuitGlyph suit={suit} x={107} y={200} size={36} />
    </g>
  );
}

function TrumpTicks(): JSX.Element {
  const d = 'M18 28 H28 V18 M222 18 V28 H232 M18 322 V332 H28 M232 332 H222 V322';
  return <path d={d} fill="none" stroke="#C2410C" strokeWidth="4" />;
}
