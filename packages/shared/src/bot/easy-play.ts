import type { Card, Suit } from '../cards/types';
import { cardId, RANKS_ORDERED } from '../cards/types';
import type { GameType } from '../games/types';
import type { PartnerSlot } from '../partners/slots';
import { trickWinner, type PlayedCard } from '../trick/winner';
import { cardPointValue } from '../cards/deck';

const RANK_VALUE: Record<string, number> = {};
RANKS_ORDERED.forEach((rank, index) => {
  RANK_VALUE[rank] = index;
});

export interface PlayView {
  gameType: GameType;
  selfId: string;
  bidderId: string;
  trump: Suit;
  slots: readonly PartnerSlot[];
  partners: readonly string[];
  seatOrder: readonly string[];
  currentTrick: readonly PlayedCard[];
  trickCount: number;
  cardsPerPlayer: number;
  teamPoints: number;
  bidAmount: number;
  premiumAwarded: { spades: boolean; hearts: boolean };
  rng: () => number;
}

/** Easy card choice. 15% of the time a uniform legal card; otherwise the heuristic. */
export function choosePlay(legal: readonly Card[], view: PlayView): Card {
  const first = legal[0];
  if (!first) throw new Error('No legal card');
  if (legal.length === 1) return first;
  if (view.rng() < 0.15) {
    const index = Math.floor(view.rng() * legal.length);
    return legal[index] ?? first;
  }
  return legal.reduce((best, card) => (scoreCard(card, view) > scoreCard(best, view) ? card : best));
}

function scoreCard(card: Card, view: PlayView): number {
  const leading = view.currentTrick.length === 0;
  const called = isOpenCalled(card, view.slots);
  let score = -(RANK_VALUE[card.rank] ?? 0);
  if (called && !mustPlayCalled(view)) score -= 40;
  if (leading) score += leadBonus(card, view, called);
  else score += followBonus(card, view);
  return score;
}

function leadBonus(card: Card, view: PlayView, called: boolean): number {
  let score = 0;
  const openSuits = new Set(view.slots.filter((slot) => slot.filledBy === null).map((slot) => slot.card.suit));
  const defending = view.selfId !== view.bidderId && !view.partners.includes(view.selfId);
  if (defending && openSuits.has(card.suit) && !called) score += 50;
  if (card.rank === 'A' && card.suit !== view.trump) score += 35;
  if (called && isCloserHolder(view) && pointsNeeded(view) <= 30) score += 25;
  return score;
}

function followBonus(card: Card, view: PlayView): number {
  let score = 0;
  const wins = winsTrick(card, view);
  if (wins && trickHasUnawardedPremium(view)) score += 70;
  if (wins && trickFacePoints(view) >= 10) score += 30;
  if (wins && card.suit === view.trump && view.currentTrick[0]?.card.suit !== view.trump) score += 10;
  if (!wins && card.suit !== view.currentTrick[0]?.card.suit) score -= 5;
  return score;
}

function isOpenCalled(card: Card, slots: readonly PartnerSlot[]): boolean {
  const key = cardId(card);
  return slots.some((slot) => slot.filledBy === null && cardId(slot.card) === key);
}

function mustPlayCalled(view: PlayView): boolean {
  return view.trickCount >= view.cardsPerPlayer - 1;
}

function pointsNeeded(view: PlayView): number {
  return view.bidAmount - view.teamPoints;
}

function isCloserHolder(view: PlayView): boolean {
  const bidderAt = view.seatOrder.indexOf(view.bidderId);
  const selfAt = view.seatOrder.indexOf(view.selfId);
  if (bidderAt < 0 || selfAt < 0) return false;
  const distance = (selfAt - bidderAt + view.seatOrder.length) % view.seatOrder.length;
  return distance > 0 && distance <= 2;
}

function winsTrick(card: Card, view: PlayView): boolean {
  const winner = trickWinner([...view.currentTrick, { playerId: view.selfId, card }], view.trump);
  return winner?.playerId === view.selfId;
}

function trickFacePoints(view: PlayView): number {
  return view.currentTrick.reduce((sum, play) => sum + cardPointValue(play.card), 0);
}

function trickHasUnawardedPremium(view: PlayView): boolean {
  return view.currentTrick.some((play) => {
    if (play.card.rank !== '3') return false;
    if (play.card.suit === 'spades' && !view.premiumAwarded.spades) return true;
    return view.gameType === '500' && play.card.suit === 'hearts' && !view.premiumAwarded.hearts;
  });
}
