import { cardId, type BidEntry, type Card, type GameType, type PartnerSlot, type Suit } from '@250-500/shared';
import { SuitIcon } from '../components/shared/SuitIcon';
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

export function scoreExplainer(gameType: GameType, compact = false): string {
  const bonus = gameType === '250' ? 100 : 200;
  if (compact) return `Bidder ± bid + ${bonus}. Partners ± bid.`;
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
    <p data-testid="auction-recap" data-trump={trump ?? ''} className="text-sm text-stone-700">
      Auction: {lines.join(', ') || 'no bid'}
      {trump ? <span className="inline-flex items-center gap-1"> · Trump: {trump} <SuitIcon suit={trump} size={18} className="shrink-0" /></span> : ''}
      {calledText ? ` · Called ${calledText}` : ''}
    </p>
  );
}

export function ScoreStrip({
  names,
  scores,
  order,
  chips = false,
  narrow = false,
  turnId = null,
  bidderId = null,
}: {
  names: Record<string, string>;
  scores: Record<string, number>;
  order: string[];
  chips?: boolean;
  /** Narrow window: wrap chips so the name and score are not clipped. */
  narrow?: boolean;
  /** Player about to act. Drawn with the turn ring. */
  turnId?: string | null;
  /** Winning bidder, once the auction has a winner. Drawn with the bidder ring. */
  bidderId?: string | null;
}): JSX.Element {
  const items = order.map((id) => ({
    id,
    name: names[id] ?? id,
    score: scores[id] ?? 0,
    turn: id === turnId,
    bidder: id === bidderId,
  }));
  if (chips) {
    return (
      <ul data-testid="score-strip" className="flex flex-nowrap items-start justify-center gap-0.5">
        {items.map((item) => (
          <ScoreChip key={item.id} item={item} label={narrow ? shortScoreLabel(item.name) : item.name} />
        ))}
      </ul>
    );
  }
  return (
    <ul data-testid="score-strip" className="grid grid-cols-2 gap-1 text-sm text-stone-700">
      {items.map((item) => (
        <li key={item.id} data-testid="score-chip" title={item.name} aria-label={`${item.name} ${item.score}`} className={chipClass(item, 'flex items-center justify-between gap-1 rounded-lg bg-white px-2 py-1')}>
          <span className="flex min-w-0 items-center gap-1">
            {item.turn && <TurnPill />}
            <span data-testid="score-chip-text">{item.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span data-testid="score-chip-score" className="tabular-nums">{item.score}</span>
            {item.bidder && <BidderPill />}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "Ada" becomes "A". "Bot 2" becomes "B2". The full name stays on the chip's title. */
function shortScoreLabel(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? name;
  if (parts.length <= 1) return first.slice(0, 1);
  return `${first.slice(0, 1)}${parts.slice(1).join('')}`;
}

function ScoreChip({ item, label }: { item: { id: string; name: string; score: number; turn: boolean; bidder: boolean }; label: string }): JSX.Element {
  return (
    <li
      data-testid="score-chip"
      title={item.name}
      aria-label={`${item.name} ${item.score}`}
      className={chipClass(item, 'flex shrink-0 items-center justify-center gap-0.5 rounded-full bg-white px-0.5 py-1 text-center text-sm text-stone-700')}
    >
      {item.turn && <TurnPill />}
      <span data-testid="score-chip-text" className="whitespace-nowrap">
        {label} <span data-testid="score-chip-score" className="tabular-nums">{item.score}</span>
      </span>
      {item.bidder && <BidderPill />}
    </li>
  );
}

function chipClass(item: { turn: boolean; bidder: boolean }, base: string): string {
  const cue = [
    item.turn ? 'ring-2 ring-inset ring-felt' : '',
    item.bidder ? 'border-2 border-dashed border-[#8A6700]' : '',
  ].filter(Boolean).join(' ');
  return `${base} ${cue}`;
}

function TurnPill(): JSX.Element {
  return (
    <span data-testid="turn-marker" aria-hidden="true" className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-felt px-0.5 text-[14px] font-medium leading-none text-white">
      ▶
    </span>
  );
}

function BidderPill(): JSX.Element {
  return (
    <span data-testid="bidder-marker" aria-hidden="true" className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#4A3000] px-0.5 text-[14px] font-medium leading-none text-white">
      B
    </span>
  );
}
