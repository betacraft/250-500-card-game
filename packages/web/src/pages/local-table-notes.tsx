import { cardId, type BidEntry, type Card, type GameType, type PartnerSlot, type Suit } from '@250-500/shared';
import { HUMAN_ID } from '../stores/local-play-store';

/** Own-hand notice. 500 holders are not partners until a called card is played. */
export function privateNotice(
  hand: readonly Card[],
  called: readonly Card[],
  bidderId: string | null,
  gameType: GameType,
  slots: readonly PartnerSlot[],
): string | null {
  if (!bidderId || bidderId === HUMAN_ID || called.length === 0) return null;
  const held = called.filter((card) => hand.some((owned) => cardId(owned) === cardId(card)));
  if (held.length === 0) return null;
  if (gameType === '250') return "You're a partner";
  const stillMine = held.some((card) => {
    const slot = slots.find((item) => cardId(item.card) === cardId(card));
    return !slot?.filledBy || slot.filledBy === HUMAN_ID;
  });
  return stillMine ? 'You hold a called card' : null;
}

export function scoreExplainer(gameType: GameType): string {
  const bonus = gameType === '250' ? 100 : 200;
  return `The bidder wins or loses the bid + ${bonus}. Each partner wins or loses the bid.`;
}

export function AuctionRecap({
  history,
  names,
  trump,
  called,
  winnerId,
  winningBid,
}: {
  history: readonly BidEntry[];
  names: Record<string, string>;
  trump: Suit | null;
  called: readonly Card[];
  winnerId?: string | null;
  winningBid?: number | null;
}): JSX.Element | null {
  const lines = history.map((entry) => {
    const name = names[entry.playerId] ?? entry.playerId;
    return entry.action === 'pass' ? `${name} pass` : `${name} ${entry.amount ?? ''}`.trim();
  });
  const listed = history.some((entry) => entry.action === 'bid' && entry.playerId === winnerId && entry.amount === winningBid);
  if (!listed && winnerId && typeof winningBid === 'number') lines.push(`${names[winnerId] ?? winnerId} ${winningBid}`);
  if (lines.length === 0 && !trump) return null;
  const calledText = called.map((card) => `${card.rank}${card.suit[0]}`).join(' ');
  return (
    <p data-testid="auction-recap" className="text-sm text-stone-700">
      Auction: {lines.join(', ') || 'no bid'}
      {trump ? ` · Trump ${trump}` : ''}
      {calledText ? ` · Called ${calledText}` : ''}
    </p>
  );
}

export function ScoreStrip({
  names,
  scores,
  order,
  chips = false,
}: {
  names: Record<string, string>;
  scores: Record<string, number>;
  order: string[];
  chips?: boolean;
}): JSX.Element {
  if (chips) {
    return (
      <ul className="flex flex-nowrap gap-1 text-sm text-stone-700">
        {order.map((id) => (
          <li key={id} className="min-w-0 flex-1 truncate rounded-full bg-white px-1 py-1 text-center">
            {names[id] ?? id} {scores[id] ?? 0}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-1 text-sm text-stone-700">
      {order.map((id) => (
        <li key={id} className="flex justify-between rounded-lg bg-white px-2 py-1">
          <span>{names[id] ?? id}</span>
          <span className="tabular-nums">{scores[id] ?? 0}</span>
        </li>
      ))}
    </ul>
  );
}
