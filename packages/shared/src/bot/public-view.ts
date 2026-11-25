import { cardPointValue } from '../cards/deck';
import type { Card, Suit } from '../cards/types';
import type { GameHand } from '../engine/hand';
import { rulesFor } from '../games';
import type { PartnerSlot } from '../partners/slots';
import type { PlayedCard } from '../trick/winner';

/** Everything a bot is allowed to know. No other hands, no unrevealed partners. */
export interface PublicBotView {
  gameType: GameHand['gameType'];
  selfId: string;
  hand: readonly Card[];
  bidderId: string;
  trump: Suit;
  slots: readonly PartnerSlot[];
  revealedPartners: readonly string[];
  seatOrder: readonly string[];
  currentTrick: readonly PlayedCard[];
  trickCount: number;
  cardsPerPlayer: number;
  revealedTeamPoints: number;
  bidAmount: number;
  premiumAwarded: { spades: boolean; hearts: boolean };
}

/** Partners the table has seen. 250 stays hidden until that player plays a called card. */
export function visiblePartners(state: GameHand): string[] {
  if (state.gameType === '250') return [...state.shownPartners];
  const ids = new Set<string>();
  for (const slot of state.slots) {
    if (slot.filledBy && slot.filledBy !== state.bidder) ids.add(slot.filledBy);
  }
  return [...ids];
}

/** Build the public view for one seat. Unrevealed partners are omitted in both variants. */
export function toPublicView(state: GameHand, selfId: string): PublicBotView {
  const unique = visiblePartners(state);
  const known = new Set<string>([state.bidder ?? '', ...unique]);
  let points = 0;
  for (const id of known) {
    if (!id) continue;
    for (const card of state.collected[id] ?? []) points += cardPointValue(card);
  }
  if (state.premiumWinner.spades && known.has(state.premiumWinner.spades)) points += 30;
  if (state.gameType === '500' && state.premiumWinner.hearts && known.has(state.premiumWinner.hearts)) points += 30;
  return {
    gameType: state.gameType,
    selfId,
    hand: (state.hands[selfId] ?? []).slice(),
    bidderId: state.bidder ?? selfId,
    trump: state.trump ?? 'spades',
    slots: state.slots.map((slot) => ({ card: slot.card, filledBy: slot.filledBy })),
    revealedPartners: unique,
    seatOrder: state.seatOrder,
    currentTrick: state.currentTrick.slice(),
    trickCount: state.trickCount,
    cardsPerPlayer: rulesFor(state.gameType).CARDS_PER_PLAYER,
    revealedTeamPoints: points,
    bidAmount: state.bidAmount ?? 0,
    premiumAwarded: {
      spades: state.premiumWinner.spades !== null,
      hearts: state.premiumWinner.hearts !== null,
    },
  };
}

