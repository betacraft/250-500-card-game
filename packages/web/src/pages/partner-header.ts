import { visiblePartners, type GameHand } from '@250-500/shared';

/**
 * Names for the table header. During play this is only partners the table
 * has seen play a called card. After the hand is scored, the scoring
 * partners are public and replace that list.
 */
export function headerPartnerIds(hand: GameHand, scoredPartners: readonly string[] | null): string[] {
  const source = scoredPartners ?? visiblePartners(hand);
  const order = new Map(hand.seatOrder.map((id, index) => [id, index]));
  const unique = [...new Set(source)].filter((id) => id.length > 0 && id !== hand.bidder);
  return unique.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}
