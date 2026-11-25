import { useLayoutEffect, useRef, useState } from 'react';
import { cardId, type BidEntry, type Card, type GameType, type PartnerSlot, type Suit } from '@250-500/shared';
import { SUIT_FILL } from '../components/cards/suit-glyphs';
import { SuitIcon } from '../components/shared/SuitIcon';
import { HUMAN_ID } from '../stores/local-play-store';

const SUIT_GLYPH: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };

/** Tiny "♥ 160" label for the bidder's seat at a short height. */
export function bidderBidText(suit: Suit, amount: number): string {
  return `${SUIT_GLYPH[suit]} ${amount}`;
}

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
      {trump ? <>{' · '}<span className="inline-flex items-center gap-1">Trump: {trump} <SuitIcon suit={trump} size={18} className="shrink-0" /></span></> : null}
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
  selfId = null,
  partnerIds = [],
  glowIds = [],
  bidderBid = null,
  privateHolderId = null,
}: {
  names: Record<string, string>;
  scores: Record<string, number>;
  order: string[];
  chips?: boolean;
  /** Narrow window: 12px text, wrapping to two rows when one row would be smaller. */
  narrow?: boolean;
  /** Player about to act. Drawn with the turn ring. */
  turnId?: string | null;
  /** Winning bidder, once the auction has a winner. Drawn with the bidder ring. */
  bidderId?: string | null;
  /** This player's chip is drawn first on a phone. */
  selfId?: string | null;
  /** Partners the table has seen. Unrevealed partners are omitted. */
  partnerIds?: readonly string[];
  /** The partner whose toast is up. Their seat glows, then keeps the badge. */
  glowIds?: readonly string[];
  /** Suit and bid painted on the bidder's seat. Null keeps the tall-layout status line in charge. */
  bidderBid?: { suit: Suit; amount: number } | null;
  /** This seat secretly holds a called card. Hollow star, never a public badge. */
  privateHolderId?: string | null;
}): JSX.Element {
  const partners = new Set(partnerIds);
  const glowing = new Set(glowIds);
  const items = order.map((id) => ({
    id,
    name: names[id] ?? id,
    score: scores[id] ?? 0,
    turn: id === turnId,
    bidder: id === bidderId,
    partner: partners.has(id),
    secret: id === privateHolderId && !partners.has(id),
    glow: glowing.has(id),
    bid: id === bidderId && bidderBid ? bidderBidText(bidderBid.suit, bidderBid.amount) : null,
  }));
  if (chips && narrow) return <PhoneChips items={selfFirst(items, selfId)} />;
  if (chips) {
    return (
      <ul data-testid="score-strip" data-rows="1" className="flex flex-nowrap items-start justify-center gap-0.5">
        {items.map((item) => (
          <ScoreChip key={item.id} item={item} label={item.name} compact={false} />
        ))}
      </ul>
    );
  }
  return (
    <ul data-testid="score-strip" className="grid grid-cols-2 gap-1 text-sm text-stone-700">
      {items.map((item) => (
        <li key={item.id} data-testid="score-chip" title={item.name} aria-label={`${item.name} ${item.score}`} className={chipClass(item, 'flex items-center justify-between gap-1 rounded-lg bg-white px-2 py-1')}>
          <span className="flex min-w-0 items-center gap-1">
            {item.turn && <TurnPill compact={false} />}
            <span data-testid="score-chip-text">{item.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <span data-testid="score-chip-score" className="tabular-nums">{item.score}</span>
            {item.bidder && <BidderPill compact={false} />}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface ChipItem {
  id: string;
  name: string;
  score: number;
  turn: boolean;
  bidder: boolean;
  partner: boolean;
  secret: boolean;
  glow: boolean;
  bid: string | null;
}

function selfFirst(items: ChipItem[], selfId: string | null): ChipItem[] {
  if (!selfId) return items;
  const self = items.find((item) => item.id === selfId);
  if (!self) return items;
  return [self, ...items.filter((item) => item.id !== selfId)];
}

/** Two rows of 12px chips when one row would be tighter than 12px. */
function PhoneChips({ items }: { items: ChipItem[] }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(false);
  const signature = items.map((item) => `${item.id}:${item.score}:${item.turn}:${item.bidder}:${item.partner}:${item.secret}:${item.glow}:${item.bid ?? ''}`).join('|');
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const chips = [...root.querySelectorAll('[data-testid="score-chip"]')];
    const gap = 4;
    const needed = chips.reduce((sum, chip) => sum + (chip instanceof HTMLElement ? chip.offsetWidth : 0), 0) + gap * Math.max(chips.length - 1, 0);
    const next = chips.length > 3 && needed > root.clientWidth + 1;
    setSplit((prev) => (prev === next ? prev : next));
  }, [signature]);
  const mid = Math.ceil(items.length / 2);
  const rows = split ? [items.slice(0, mid), items.slice(mid)] : [items];
  return (
    <div ref={ref} data-testid="score-strip" data-rows={rows.length} className="flex w-full flex-col items-center gap-1">
      {rows.map((row, index) => (
        <ul key={row[0]?.id ?? index} className="flex max-w-full flex-nowrap items-stretch justify-center gap-1">
          {row.map((item) => (
            <ScoreChip key={item.id} item={item} label={shortScoreLabel(item.name)} compact />
          ))}
        </ul>
      ))}
    </div>
  );
}

/** "Ada" becomes "A". "Bot 2" becomes "B2". The full name stays on the chip's title. */
function shortScoreLabel(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? name;
  if (parts.length <= 1) return first.slice(0, 1);
  return `${first.slice(0, 1)}${parts.slice(1).join('')}`;
}

function ScoreChip({
  item,
  label,
  compact,
}: {
  item: ChipItem;
  label: string;
  compact: boolean;
}): JSX.Element {
  const marks = (
    <>
      {item.turn && <TurnPill compact={compact} />}
      {item.bidder && <BidderPill compact={compact} />}
      {item.partner && <PartnerBadge />}
      {item.secret && <SecretStar />}
      {item.bid && <BidderBid text={item.bid} />}
    </>
  );
  const labelText = `${item.name} ${item.score}${item.partner ? ' partner' : ''}${item.bid ? ` ${item.bid}` : ''}`;
  const glow = item.glow ? 'partner-glow' : '';
  if (compact) {
    const frame = item.bidder ? 'border-dashed border-[#8A6700]' : 'border-transparent';
    const ring = item.turn ? 'ring-2 ring-inset ring-felt' : '';
    return (
      <li
        data-testid="score-chip"
        title={item.name}
        aria-label={labelText}
        className={`flex w-max shrink-0 flex-col items-center justify-center rounded-2xl border-2 bg-white px-1 py-1 text-center text-xs leading-none text-stone-700 ${frame} ${ring} ${glow}`}
      >
        <span className="flex h-4 items-center justify-center gap-0.5">{marks}</span>
        <span data-testid="score-chip-text" className="mt-0.5 whitespace-nowrap">{label}</span>
        <span data-testid="score-chip-score" className="mt-0.5 whitespace-nowrap tabular-nums">{item.score}</span>
      </li>
    );
  }
  return (
    <li
      data-testid="score-chip"
      title={item.name}
      aria-label={labelText}
      className={chipClass(item, `flex shrink-0 items-center justify-center gap-0.5 rounded-full bg-white px-0.5 py-1 text-center text-sm text-stone-700 ${glow}`)}
    >
      {marks}
      <span data-testid="score-chip-text" className="whitespace-nowrap">
        {label} <span data-testid="score-chip-score" className="tabular-nums">{item.score}</span>
      </span>
    </li>
  );
}

function PartnerBadge(): JSX.Element {
  return <span data-testid="partner-badge" aria-hidden="true" className="inline-flex h-4 min-w-4 items-center justify-center text-[12px] leading-none text-felt">★</span>;
}

function SecretStar(): JSX.Element {
  return <span data-testid="private-star" aria-hidden="true" className="inline-flex h-4 min-w-4 items-center justify-center text-[12px] leading-none text-felt">☆</span>;
}

function BidderBid({ text }: { text: string }): JSX.Element {
  const suit = (Object.keys(SUIT_GLYPH) as Suit[]).find((name) => text.startsWith(SUIT_GLYPH[name]));
  return (
    <span data-testid="bidder-bid" className="whitespace-nowrap text-[10px] font-medium leading-none" style={{ color: suit ? SUIT_FILL[suit] : '#1C1C24' }}>
      {text}
    </span>
  );
}

function chipClass(item: { turn: boolean; bidder: boolean }, base: string): string {
  const cue = [
    item.turn ? 'ring-2 ring-inset ring-felt' : '',
    item.bidder ? 'border-2 border-dashed border-[#8A6700]' : '',
  ].filter(Boolean).join(' ');
  return `${base} ${cue}`;
}

function TurnPill({ compact }: { compact: boolean }): JSX.Element {
  const box = compact ? 'h-4 w-4 text-[12px]' : 'h-5 min-w-5 px-0.5 text-[14px]';
  return (
    <span data-testid="turn-marker" aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-felt font-medium leading-none text-white ${box}`}>
      ▶
    </span>
  );
}

function BidderPill({ compact }: { compact: boolean }): JSX.Element {
  const box = compact ? 'h-4 w-4 text-[12px]' : 'h-5 min-w-5 px-0.5 text-[14px]';
  return (
    <span data-testid="bidder-marker" aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#4A3000] font-medium leading-none text-white ${box}`}>
      B
    </span>
  );
}
