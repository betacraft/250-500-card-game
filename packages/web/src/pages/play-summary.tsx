import { type BidEntry, type Card, type Suit } from '@250-500/shared';
import { AuctionRecap } from './local-table-notes';
import { publicTeamPoints, TableStatus } from './local-play-helpers';
import { headerPartnerIds } from './partner-header';
import { useLocalPlayStore } from '../stores/local-play-store';

type Hand = NonNullable<ReturnType<typeof useLocalPlayStore.getState>['hand']>;

const SUIT_GLYPH: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };

/**
 * One line for the band above the felt: the called faces, the partners the
 * table has seen, and the points those seats have shown.
 */
export function summaryText(called: readonly Card[], partners: readonly string[], points: number): string {
  const faces = called.map((card) => `${card.rank}${SUIT_GLYPH[card.suit]}`).join(' ');
  const who = partners.length > 0 ? partners.join(', ') : 'none yet';
  return `Called ${faces} · Partners: ${who} · ${points} pts`;
}

interface PlaySummaryProps {
  hand: Hand;
  names: Record<string, string>;
  notice: string | null;
  history: readonly BidEntry[];
  open: boolean;
  onToggle: () => void;
}

/** Compact play notes. The full auction stays behind the line, so nothing scrolls. */
export function PlaySummary({ hand, names, notice, history, open, onToggle }: PlaySummaryProps): JSX.Element {
  const partners = headerPartnerIds(hand, null);
  const line = summaryText(hand.calledCards, partners.map((id) => names[id] ?? id), publicTeamPoints(hand, partners));
  return (
    <div data-testid="play-summary" className="shrink-0">
      {notice ? <p data-testid="private-partner" className="text-sm font-medium leading-5 text-felt">{notice}</p> : null}
      <button type="button" data-testid="summary-line" aria-expanded={open} onClick={onToggle} className="block w-full rounded-lg bg-white px-2 text-left text-sm leading-5 text-stone-800">
        {line}
      </button>
      {open ? (
        <div data-testid="summary-detail" className="mt-1">
          <TableStatus hand={hand} names={names} faces={false} />
          <AuctionRecap history={history} names={names} trump={hand.trump} called={hand.calledCards} winnerId={hand.bidder} winningBid={hand.bidAmount} />
        </div>
      ) : null}
    </div>
  );
}
