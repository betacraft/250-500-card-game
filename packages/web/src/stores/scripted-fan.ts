import type { Card, GameHand } from '@250-500/shared';

const HUMAN_ID = 'p1';

/** How many cards `?script=cards&n=` should leave in the human hand. */
export function scriptCount(): number {
  if (typeof window === 'undefined') return 2;
  const raw = Number(new URLSearchParams(window.location.search).get('n'));
  if (!Number.isFinite(raw) || raw < 1) return 2;
  return Math.min(12, Math.floor(raw));
}

/** Drop the human hand to `count` cards so a small fan can be photographed. */
export function keepHumanCards(hand: GameHand, count: number): GameHand {
  const held = hand.hands[HUMAN_ID] ?? [];
  return {
    ...hand,
    hands: { ...hand.hands, [HUMAN_ID]: held.slice(0, count) },
    currentTrick: [],
    toPlayerId: HUMAN_ID,
  };
}

/** One card from each seat, so an eight-card trick can show seat labels. */
export function labelTrick(hand: GameHand): GameHand {
  const trick: { playerId: string; card: Card }[] = [];
  const hands: Record<string, Card[]> = {};
  for (const id of hand.seatOrder) {
    const cards = [...(hand.hands[id] ?? [])];
    const card = cards.shift();
    hands[id] = cards;
    if (card) trick.push({ playerId: id, card });
  }
  return { ...hand, hands, currentTrick: trick, toPlayerId: null };
}
