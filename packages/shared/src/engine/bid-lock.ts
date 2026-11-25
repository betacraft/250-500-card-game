import { buildDeck, cardPointValue } from '../cards/deck';
import { rulesFor } from '../games';
import { visiblePartners } from '../bot/public-view';
import type { GameHand } from './hand';

/** Public bid outcome. Null while the remaining points could still go either way. */
export type BidLockKind = 'made' | 'sunk';

export interface BidLockDetail {
  kind: BidLockKind | null;
  /** Points already won by the bidder and revealed partners. */
  k: number;
  /** Points already won by players who might still become partners. */
  u: number;
  /** Pip points still out, plus 30 for each premium 3 that has not been won. */
  r: number;
}

const PIP_TOTAL = new Map<string, number>();

/**
 * Decide the bid from public trick results only.
 * A hidden partner's points stay in U or R, so they cannot flip a lock.
 */
export function bidLockDetail(hand: GameHand): BidLockDetail {
  const bid = hand.bidAmount ?? 0;
  const bidder = hand.bidder ?? '';
  const revealed = new Set(visiblePartners(hand));
  const unresolved = unresolvedIds(hand, bidder, revealed);
  let k = seatPoints(hand, bidder);
  let u = 0;
  for (const id of revealed) k += seatPoints(hand, id);
  for (const id of unresolved) u += seatPoints(hand, id);
  const r = pointsStillOut(hand);
  const kind = k >= bid ? 'made' : k + u + r < bid ? 'sunk' : null;
  return { kind, k, u, r };
}

/** `made` when the known team already has the bid. `sunk` when even the rest cannot. */
export function bidLock(hand: GameHand): BidLockKind | null {
  return bidLockDetail(hand).kind;
}

function unresolvedIds(hand: GameHand, bidder: string, revealed: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>();
  if (!couldStillReveal(hand)) return ids;
  for (const id of hand.seatOrder) {
    if (id !== bidder && !revealed.has(id)) ids.add(id);
  }
  return ids;
}

function couldStillReveal(hand: GameHand): boolean {
  if (hand.gameType === '500') return hand.slots.some((slot) => !slot.filledBy);
  return hand.shownPartners.size < rulesFor(hand.gameType).PARTNERS_TO_CALL;
}

function seatPoints(hand: GameHand, id: string): number {
  let points = 0;
  for (const card of hand.collected[id] ?? []) points += cardPointValue(card);
  if (hand.premiumWinner.spades === id) points += 30;
  if (hand.gameType === '500' && hand.premiumWinner.hearts === id) points += 30;
  return points;
}

function pointsStillOut(hand: GameHand): number {
  let collected = 0;
  for (const id of hand.seatOrder) {
    for (const card of hand.collected[id] ?? []) collected += cardPointValue(card);
  }
  for (const play of hand.currentTrick) collected += cardPointValue(play.card);
  let premium = hand.premiumWinner.spades === null ? 30 : 0;
  if (hand.gameType === '500' && hand.premiumWinner.hearts === null) premium += 30;
  return pipTotal(hand) - collected + premium;
}

function pipTotal(hand: GameHand): number {
  const cached = PIP_TOTAL.get(hand.gameType);
  if (cached !== undefined) return cached;
  const total = buildDeck(hand.gameType).reduce((sum, card) => sum + cardPointValue(card), 0);
  PIP_TOTAL.set(hand.gameType, total);
  return total;
}
