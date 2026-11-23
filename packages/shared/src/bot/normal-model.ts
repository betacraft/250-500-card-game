import type { Card, Suit } from '../cards/types';
import type { PublicBotView } from './public-view';

export const SEATS = 8;
export const STRIDE = 16;
export const FACES = 48;
export const SUIT_OF = new Uint8Array(FACES);
export const RANK_OF = new Uint8Array(FACES);
export const POINT_OF = new Uint8Array(FACES);
const SUIT_INDEX: Record<Suit, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };

export function suitIndex(suit: Suit): number {
  return SUIT_INDEX[suit] ?? 0;
}
const RANK_INDEX: Record<string, number> = { '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5, '9': 6, '10': 7, J: 8, Q: 9, K: 10, A: 11 };

for (let suit = 0; suit < 4; suit += 1) {
  for (let rank = 0; rank < 12; rank += 1) {
    const face = suit * 12 + rank;
    SUIT_OF[face] = suit;
    RANK_OF[face] = rank;
    POINT_OF[face] = rank >= 7 ? 10 : rank === 2 ? 5 : 0;
  }
}

export interface Work {
  seats: number;
  actor: number;
  bidder: number;
  trump: number;
  is500: number;
  bid: number;
  bonus: number;
  total: number;
  per: number;
  slotCount: number;
  poolN: number;
  trickLen: number;
  baseTrickLen: number;
  spadesDone: number;
  heartsDone: number;
  baseSpades: number;
  baseHearts: number;
  cards: Int16Array;
  counts: Int8Array;
  sampleCards: Int16Array;
  sampleCounts: Int8Array;
  points: Int16Array;
  basePoints: Int16Array;
  partner: Uint8Array;
  basePartner: Uint8Array;
  pool: Int16Array;
  used: Uint8Array;
  remain: Int8Array;
  trickFace: Int16Array;
  trickSeat: Int8Array;
  baseTrickFace: Int16Array;
  baseTrickSeat: Int8Array;
  slotFace: Int16Array;
  slotOwner: Int8Array;
  baseSlotOwner: Int8Array;
  dealt0: Int8Array;
  dealt1: Int8Array;
  seen: Uint8Array;
  called: Int16Array;
  calledN: number;
}

export function faceOf(card: Card): number {
  return (SUIT_INDEX[card.suit] ?? 0) * 12 + (RANK_INDEX[card.rank] ?? 0);
}

export function serialOf(card: Card, view: PublicBotView, used: Uint8Array, claim: boolean): number {
  const total = view.gameType === '250' ? 48 : 96;
  const fromId = card.id?.startsWith(`${view.gameType}-`) ? Number(card.id.slice(view.gameType.length + 1)) : -1;
  if (Number.isInteger(fromId) && fromId >= 0 && fromId < total && (!claim || used[fromId] !== 1)) {
    if (claim) used[fromId] = 1;
    return fromId;
  }
  const face = faceOf(card);
  const copies = view.gameType === '500' ? 2 : 1;
  for (let copy = 0; copy < copies; copy += 1) {
    const serial = face + copy * FACES;
    if (serial < total && (!claim || used[serial] !== 1)) {
      if (claim) used[serial] = 1;
      return serial;
    }
  }
  return -1;
}
