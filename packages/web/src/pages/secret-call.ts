import { cardId, visiblePartners, type Card, type GameHand, type GameType, type PartnerSlot } from '@250-500/shared';

/**
 * The seat still holds a called card the table has not seen played.
 * This is private. Bots read `visiblePartners`, not this.
 */
export function holdsSecretCall(hand: GameHand, playerId: string): boolean {
  if (!hand.bidder || playerId === hand.bidder) return false;
  if (visiblePartners(hand).includes(playerId)) return false;
  const owned = hand.hands[playerId] ?? [];
  return hand.calledCards.some((called) => {
    const face = cardId(called);
    if (!owned.some((card) => cardId(card) === face)) return false;
    if (hand.gameType === '500') {
      const slot = hand.slots.find((item) => cardId(item.card) === face);
      return !slot?.filledBy;
    }
    return true;
  });
}

/**
 * Before a reveal, only say that a called card is held.
 * After it, name the bidder. A leftover called card stays on this private line.
 */
export function privateNotice(
  hand: readonly Card[],
  called: readonly Card[],
  bidderId: string | null,
  gameType: GameType,
  slots: readonly PartnerSlot[],
  bidderName = 'Bidder',
  revealed = false,
): string | null {
  if (!bidderId || bidderId === 'p1') return null;
  const unplayed = called.filter((card) => hand.some((owned) => cardId(owned) === cardId(card)) && slotStillOpen(card, gameType, slots));
  if (!revealed) return unplayed.length > 0 ? 'You hold a called card' : null;
  const base = `You're ${bidderName}'s partner`;
  if (unplayed.length === 0) return base;
  const noun = unplayed.length === 1 ? 'card' : 'cards';
  return `${base} · ${unplayed.length} called ${noun} left`;
}

function slotStillOpen(card: Card, gameType: GameType, slots: readonly PartnerSlot[]): boolean {
  if (gameType !== '500') return true;
  const slot = slots.find((item) => cardId(item.card) === cardId(card));
  return !slot?.filledBy || slot.filledBy === 'p1';
}
