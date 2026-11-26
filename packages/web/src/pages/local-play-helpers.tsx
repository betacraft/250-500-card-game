import { useEffect, useState } from 'react';
import { cardId, rulesFor, type Card, type GameType, type Suit } from '@250-500/shared';
import { SuitIcon } from '../components/shared/SuitIcon';
import { CardFace } from '../components/cards/CardFace';
import { HUMAN_ID, useLocalPlayStore } from '../stores/local-play-store';
import { headerPartnerIds } from './partner-header';

type Hand = NonNullable<ReturnType<typeof useLocalPlayStore.getState>['hand']>;

/** Signed score for the short "You +N" line. */
export function scoreText(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/** Dev-only cue so a test can show the turn ring and bidder badge together. */
export function chipCue(): { turnId?: string | null; bidderId?: string | null } | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  const cue = (window as Window & { __chipCue?: { turnId?: string | null; bidderId?: string | null } }).__chipCue;
  return cue ?? null;
}

/** Portrait height, landscape width, and the raw height used by the short layouts. */
export function useViewport(): { short: boolean; wide: boolean; height: number; width: number } {
  const [size, setSize] = useState({ short: false, wide: true, height: 800, width: 360 });
  useEffect(() => {
    const apply = (): void => setSize({ short: window.innerHeight <= 760, wide: window.innerWidth >= 720, height: window.innerHeight, width: window.innerWidth });
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);
  return size;
}

/** The follow-suit context for the human's own hand. */
export function legalContext(hand: Hand): {
  gameType: GameType;
  hand: readonly Card[];
  ledSuit: Suit | null;
  isLeading: boolean;
  playerId: string;
  bidderId: string | null;
  slots: Hand['slots'];
  trickCount: number;
  cardsPerPlayer: number;
} {
  const led = hand.currentTrick[0]?.card.suit ?? null;
  return {
    gameType: hand.gameType,
    hand: hand.hands[HUMAN_ID] ?? [],
    ledSuit: hand.currentTrick.length === 0 ? null : led,
    isLeading: hand.currentTrick.length === 0,
    playerId: HUMAN_ID,
    bidderId: hand.bidder,
    slots: hand.slots,
    trickCount: hand.trickCount,
    cardsPerPlayer: rulesFor(hand.gameType).CARDS_PER_PLAYER,
  };
}

/** Suits whose 30-point three is still unplayed and not already in this trick. */
export function handThirties(hand: { gameType: GameType; premiumWinner: { spades: string | null; hearts: string | null }; currentTrick: ReadonlyArray<{ card: Card }> }): Set<Suit> {
  const pending = new Set<Suit>();
  const trickHas = (suit: Suit): boolean => hand.currentTrick.some((play) => play.card.suit === suit && play.card.rank === '3');
  if (!hand.premiumWinner.spades && !trickHas('spades')) pending.add('spades');
  if (hand.gameType === '500' && !hand.premiumWinner.hearts && !trickHas('hearts')) pending.add('hearts');
  return pending;
}

/** Indexes in the trick that earned a first-three premium. */
export function trickThirties(played: ReadonlyArray<{ card: Card }>, hand: { gameType: GameType; premiumWinner: { spades: string | null; hearts: string | null } }): Set<number> {
  const marks = new Set<number>();
  let spades = hand.premiumWinner.spades !== null;
  let hearts = hand.gameType !== '500' || hand.premiumWinner.hearts !== null;
  played.forEach((play, index) => {
    if (!spades && play.card.suit === 'spades' && play.card.rank === '3') {
      marks.add(index);
      spades = true;
    }
    if (!hearts && play.card.suit === 'hearts' && play.card.rank === '3') {
      marks.add(index);
      hearts = true;
    }
  });
  return marks;
}

/** Public bid, trump, called cards, and the partners the table has seen. */
export function TableStatus({ hand, names, scoredPartners = null, faces = true }: { hand: Hand; names: Record<string, string>; scoredPartners?: readonly string[] | null; faces?: boolean }): JSX.Element | null {
  if (!hand.bidder || hand.bidAmount === null) return null;
  const revealed = headerPartnerIds(hand, scoredPartners);
  return (
    <div className="flex flex-wrap items-end gap-2 text-sm text-stone-700" data-testid="table-status">
      <span>{names[hand.bidder] ?? 'Bidder'} bid {hand.bidAmount}</span>
      {hand.trump && <span data-testid="trump-name" data-suit={hand.trump} className="inline-flex items-center gap-1">Trump: {hand.trump} <SuitIcon suit={hand.trump} size={18} className="shrink-0" /></span>}
      {hand.calledCards.length > 0 && (
        faces ? (
          <span className="inline-flex items-end gap-1" data-testid="called-cards">
            <span className="text-sm font-medium">Called</span>
            {hand.calledCards.map((card) => <CardFace key={cardId(card)} card={card} width={40} called />)}
          </span>
        ) : (
          <span data-testid="called-cards">Called {hand.calledCards.map((card) => `${card.rank}${card.suit[0]}`).join(' ')}</span>
        )
      )}
      <span data-testid="partner-names">Partners: {revealed.map((id) => names[id] ?? id).join(', ') || 'none yet'}</span>
      <span data-testid="team-points">Team points {publicTeamPoints(hand, revealed)}</span>
    </div>
  );
}

function publicTeamPoints(hand: Hand, partners: readonly string[]): number {
  const known = new Set<string>([hand.bidder ?? '', ...partners]);
  let points = 0;
  for (const id of known) {
    for (const card of hand.collected[id] ?? []) {
      if (card.rank === 'A' || card.rank === 'K' || card.rank === 'Q' || card.rank === 'J' || card.rank === '10') points += 10;
      else if (card.rank === '5') points += 5;
    }
  }
  if (hand.premiumWinner.spades && known.has(hand.premiumWinner.spades)) points += 30;
  if (hand.gameType === '500' && hand.premiumWinner.hearts && known.has(hand.premiumWinner.hearts)) points += 30;
  return points;
}
