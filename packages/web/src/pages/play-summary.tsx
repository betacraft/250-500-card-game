import { useEffect } from 'react';
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
  /** Landscape lock: partner note and the summary share one line. */
  row?: boolean;
}

/** Compact play notes. The full auction opens over the table, so the felt does not move. */
export function PlaySummary({ hand, names, notice, history, open, onToggle, row = false }: PlaySummaryProps): JSX.Element {
  const partners = headerPartnerIds(hand, null);
  const line = summaryText(hand.calledCards, partners.map((id) => names[id] ?? id), publicTeamPoints(hand, partners));
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onToggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onToggle]);
  return (
    <div data-testid="play-summary" className="shrink-0">
      <div className={row ? 'flex min-w-0 items-center gap-2' : ''}>
        {notice ? <p data-testid="private-partner" className={`text-sm font-medium leading-5 text-felt ${row ? 'shrink-0 whitespace-nowrap' : ''}`}>{notice}</p> : null}
        <button type="button" data-testid="summary-line" aria-expanded={open} onClick={onToggle} className={`rounded-lg bg-white px-2 text-left text-sm leading-5 text-stone-800 ${row ? 'min-w-0 flex-1 truncate' : 'block w-full'}`}>
          {line}
        </button>
      </div>
      {open ? (
        <div data-testid="summary-detail" className="fixed inset-0 z-40" onClick={onToggle}>
          <div className="absolute inset-x-3 top-16 max-h-[50vh] overflow-y-auto rounded-xl bg-white p-3 shadow-lg" onClick={(event) => event.stopPropagation()}>
            <TableStatus hand={hand} names={names} faces={false} />
            <AuctionRecap history={history} names={names} trump={hand.trump} called={hand.calledCards} winnerId={hand.bidder} winningBid={hand.bidAmount} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
