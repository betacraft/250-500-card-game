import { cardId, visiblePartners, type GameHand } from '@250-500/shared';

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
