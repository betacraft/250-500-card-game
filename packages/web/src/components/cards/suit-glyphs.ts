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

/**
 * Pip outlines in a 22×22 box. These are the CardFace pips: clubs has three
 * equal lobes, hearts keeps its cleft, and the diamond fills the box.
 */
export const SUIT_PIP: Record<Suit, string> = {
  spades: 'M11 1.5 C11 1.5 2 9 2 13.5 C2 16.5 4.2 18.5 7 18.5 C8.8 18.5 10 17.6 11 16.2 C12 17.6 13.2 18.5 15 18.5 C17.8 18.5 20 16.5 20 13.5 C20 9 11 1.5 11 1.5 Z M9.2 18 L12.8 18 L13.6 21.2 L8.4 21.2 Z',
  hearts: 'M11 19.5 C11 19.5 2 13 2 8.2 C2 5 4.2 3 7 3 C8.8 3 10.2 4 11 5.8 C11.8 4 13.2 3 15 3 C17.8 3 20 5 20 8.2 C20 13 11 19.5 11 19.5 Z',
  diamonds: 'M11 1.2 L20.5 11 L11 20.8 L1.5 11 Z',
  clubs: 'M0.4 6.8 a5.6 5.6 0 1 1 11.2 0 a5.6 5.6 0 1 1 -11.2 0 M10.4 6.8 a5.6 5.6 0 1 1 11.2 0 a5.6 5.6 0 1 1 -11.2 0 M5.4 11.6 a5.6 5.6 0 1 1 11.2 0 a5.6 5.6 0 1 1 -11.2 0 M11 16 L7.4 21.5 L14.6 21.5 Z',
};

export const SUIT_NAME: Record<Suit, string> = {
  spades: 'spades',
  hearts: 'hearts',
  diamonds: 'diamonds',
  clubs: 'clubs',
};
