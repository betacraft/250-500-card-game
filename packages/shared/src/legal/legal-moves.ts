import type { Card, Suit } from '../cards/types';
import type { GameType } from '../games/types';
import { isLegalPlay } from '../trick/winner';
import type { PartnerSlot } from '../partners/slots';
import { wouldBeSelfReveal } from '../partners/slots';

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

/** True when leading this card would illegally self-reveal in 500. */
function bannedLead(ctx: LegalPlayContext, card: Card): boolean {
  if (ctx.gameType !== '500' || !ctx.bidderId || !ctx.isLeading) return false;
  const lastTrick = ctx.trickCount >= ctx.cardsPerPlayer - 1;
  if (lastTrick) return false;
  return wouldBeSelfReveal({
    playerId: ctx.playerId,
    card,
    isLeadingTrick: true,
    bidderId: ctx.bidderId,
    slots: ctx.slots,
  });
}

/**
 * Cards this player may play. Follow-suit first.
 * A 500 called-card lead is refused while another play exists.
 * It is allowed on the last trick, and earlier if every card would be a banned lead.
 */
export function listLegalCards(ctx: LegalPlayContext): Card[] {
  const follow = ctx.hand.filter((card) => followOk(ctx, card));
  const allowed = follow.filter((card) => !bannedLead(ctx, card));
  return allowed.length > 0 ? allowed : follow;
}

/** Whether this specific card is a legal play right now. */
export function canPlayCard(ctx: LegalPlayContext, card: Card): boolean {
  return listLegalCards(ctx).some((c) => (card.id ? c.id === card.id : c.suit === card.suit && c.rank === card.rank));
}
