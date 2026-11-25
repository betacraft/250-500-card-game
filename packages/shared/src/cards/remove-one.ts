import type { Card } from './types';

/** Drop exactly one physical card. Prefers `id`, otherwise the first face match. */
export function removeOneCard(hand: readonly Card[], card: Card): Card[] {
  const byId = card.id ? hand.findIndex((c) => c.id === card.id) : -1;
  const idx = byId >= 0 ? byId : hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);
  if (idx < 0) return [...hand];
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)];
}
