import { cardId } from '../cards/types';
import type { Card } from '../cards/types';

/**
 * True when the human must follow and every legal card is the same face.
 * Identical copies count as one. A lead is never forced.
 */
export function isForcedFollow(isLeading: boolean, legal: readonly Card[]): boolean {
  if (isLeading || legal.length === 0) return false;
  const faces = new Set(legal.map((card) => cardId(card)));
  return faces.size === 1;
}
