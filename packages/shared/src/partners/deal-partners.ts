import type { Card } from '../cards/types';
import { cardId } from '../cards/types';

/**
 * 250 partnership: each called face has one holder.
 * Non-bidder holders are partners immediately. A card the bidder holds adds nobody.
 */
export function partnersFromCalledHolders(args: {
  calledCards: readonly Card[];
  bidderId: string;
  holdersByCardId: ReadonlyMap<string, ReadonlySet<string>>;
}): string[] {
  const seen = new Set<string>();
  for (const card of args.calledCards) {
    const holders = args.holdersByCardId.get(cardId(card));
    if (!holders) continue;
    for (const id of holders) {
      if (id !== args.bidderId) seen.add(id);
    }
  }
  return [...seen];
}
