import { cardId, type BidEntry, type Card, type GameType, type Suit } from '@250-500/shared';
import { HUMAN_ID } from '../stores/local-play-store';

/** True only for this seat's own cards. Not for the table line or a bot. */
export function privatelyPartner(hand: readonly Card[], called: readonly Card[], bidderId: string | null): boolean {
  if (!bidderId || bidderId === HUMAN_ID || called.length === 0) return false;
  const faces = new Set(called.map((card) => cardId(card)));
  return hand.some((card) => faces.has(cardId(card)));
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
  const bids = history.filter((entry) => entry.action === 'bid' && typeof entry.amount === 'number');
  const listed = bids.some((entry) => entry.playerId === winnerId && entry.amount === winningBid);
  const lines = bids.map((entry) => `${names[entry.playerId] ?? entry.playerId} ${entry.amount}`);
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

export function ScoreStrip({ names, scores, order }: { names: Record<string, string>; scores: Record<string, number>; order: string[] }): JSX.Element {
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
