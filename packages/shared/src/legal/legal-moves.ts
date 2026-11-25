import type { Card, Suit } from '../cards/types';
import { cardId } from '../cards/types';
import type { GameType } from '../games/types';
import { isLegalPlay } from '../trick/winner';
import type { PartnerSlot } from '../partners/slots';

export interface LegalPlayContext {
  gameType: GameType;
  hand: readonly Card[];
  ledSuit: Suit | null;
  isLeading: boolean;
  playerId: string;
  bidderId: string | null;
  slots: readonly PartnerSlot[];
  trickCount: number;
  cardsPerPlayer: number;
}

function followOk(ctx: LegalPlayContext, card: Card): boolean {
  return isLegalPlay({ card, hand: ctx.hand, ledSuit: ctx.ledSuit });
}

function openCalled(ctx: LegalPlayContext, card: Card): boolean {
  if (ctx.gameType !== '500' || !ctx.bidderId || ctx.playerId === ctx.bidderId) return false;
  const key = cardId(card);
  return ctx.slots.some((slot) => slot.filledBy === null && cardId(slot.card) === key);
}

/** 500: an open called card is legal only when it is the only way to follow suit, or the only card left. */
function calledRestricted(ctx: LegalPlayContext, card: Card): boolean {
  if (!openCalled(ctx, card)) return false;
  if (ctx.hand.length <= 1) return false;
  if (ctx.isLeading || !ctx.ledSuit || card.suit !== ctx.ledSuit) return true;
  const otherOfSuit = ctx.hand.some((held) => held !== card && held.suit === ctx.ledSuit && held.id !== card.id);
  return otherOfSuit;
}

/**
 * Legal cards for this seat.
 * If every follow-suit card is a restricted called card, those cards are allowed so the seat cannot stall.
 */
export function listLegalCards(ctx: LegalPlayContext): Card[] {
  const follow = ctx.hand.filter((card) => followOk(ctx, card));
  const allowed = follow.filter((card) => !calledRestricted(ctx, card));
  return allowed.length > 0 ? allowed : follow;
}

/** Whether this specific card is a legal play right now. */
export function canPlayCard(ctx: LegalPlayContext, card: Card): boolean {
  return listLegalCards(ctx).some((held) => (card.id ? held.id === card.id : held.suit === card.suit && held.rank === card.rank));
}

/** Short reason a visible card cannot be played, for the hand fan. */
export function illegalReason(ctx: LegalPlayContext, card: Card): string | null {
  if (canPlayCard(ctx, card)) return null;
  if (ctx.ledSuit && card.suit !== ctx.ledSuit && ctx.hand.some((held) => held.suit === ctx.ledSuit)) {
    return `Must follow ${ctx.ledSuit}`;
  }
  if (openCalled(ctx, card)) {
    if (ctx.isLeading) return 'Can’t lead a called card';
    if (ctx.ledSuit && card.suit !== ctx.ledSuit) return 'Can’t discard a called card';
    return 'Not forced to play the called card';
  }
  return 'Not a legal play';
}
