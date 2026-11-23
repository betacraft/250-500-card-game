import type { Suit } from '@250-500/shared';

/** The four card colours. CardFace and SuitIcon both paint from this map. */
export const SUIT_FILL: Record<Suit, string> = {
  spades: '#1C1C24',
  hearts: '#C93A0C',
  diamonds: '#2563EB',
  clubs: '#047857',
};

/** Page cream, the light badge behind a pip on felt, and the felt itself. */
export const SUIT_CREAM = '#F5F1E8';
export const SUIT_BADGE = '#FFFDF7';
export const SUIT_FELT = '#1A6E4A';

/** One top lobe, then two side lobes. y grows downward. */
export const CLUB_LOBES: ReadonlyArray<{ cx: number; cy: number; r: number }> = [
  { cx: 11, cy: 6.1, r: 5.15 },
  { cx: 6.15, cy: 11.7, r: 5.05 },
  { cx: 15.85, cy: 11.7, r: 5.05 },
];

/** Short flared stem: about a quarter of the 22-unit box, wide at the base. */
export const CLUB_STEM = 'M11 15.9 L7.1 21.4 L14.9 21.4 Z';

function disc(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 1 ${r * 2} 0a${r} ${r} 0 1 1 ${-r * 2} 0`;
}

/**
 * Pip outlines in a 22×22 box. Clubs points up: one lobe on top, two below,
 * then the stem. Hearts keeps its cleft, and the diamond fills the box.
 */
export const SUIT_PIP: Record<Suit, string> = {
  spades: 'M11 1.5 C11 1.5 2 9 2 13.5 C2 16.5 4.2 18.5 7 18.5 C8.8 18.5 10 17.6 11 16.2 C12 17.6 13.2 18.5 15 18.5 C17.8 18.5 20 16.5 20 13.5 C20 9 11 1.5 11 1.5 Z M9.2 18 L12.8 18 L13.6 21.2 L8.4 21.2 Z',
  hearts: 'M11 19.5 C11 19.5 2 13 2 8.2 C2 5 4.2 3 7 3 C8.8 3 10.2 4 11 5.8 C11.8 4 13.2 3 15 3 C17.8 3 20 5 20 8.2 C20 13 11 19.5 11 19.5 Z',
  diamonds: 'M11 1.2 L20.5 11 L11 20.8 L1.5 11 Z',
  clubs: `${CLUB_LOBES.map((lobe) => disc(lobe.cx, lobe.cy, lobe.r)).join('')} ${CLUB_STEM}`,
};

export const SUIT_NAME: Record<Suit, string> = {
  spades: 'spades',
  hearts: 'hearts',
  diamonds: 'diamonds',
  clubs: 'clubs',
};
