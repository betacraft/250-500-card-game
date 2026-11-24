import type { Card, Suit } from '../cards/types';
import { cardId, RANKS_ORDERED } from '../cards/types';
import { cardPointValue } from '../cards/deck';
import { trickWinner } from '../trick/winner';
import { searchNormalCard } from './normal-play-search';
import type { PublicBotView } from './public-view';

const RANK_VALUE: Record<string, number> = {};
RANKS_ORDERED.forEach((rank, index) => {
  RANK_VALUE[rank] = index;
});

/** Kept for callers. Play no longer spends them on a random rollout. */
export const NORMAL_SAMPLES = 1;
export const NORMAL_ROLLOUTS = 1;
export const NORMAL_BUDGET_MS = 150;

export interface NormalPlayArgs {
  view: PublicBotView;
  legal: readonly Card[];
  rng: () => number;
  now?: () => number;
  budgetMs?: number;
  samples?: number;
  rollouts?: number;
}

/**
 * Easy's card ordering, without Easy's 15% random card.
 * Close candidates are rolled out with that same policy on deals that
 * respect shown voids. The rollout replaces the heuristic only when the
 * seat margin is clearly better. A tight budget keeps the heuristic.
 */
export function chooseNormalPlay(args: NormalPlayArgs): Card {
  const first = args.legal[0];
  if (!first) throw new Error('No legal card');
  if (args.legal.length === 1) return first;
  const now = args.now ?? Date.now;
  const started = now();
  const budget = args.budgetMs ?? NORMAL_BUDGET_MS;
  if (now() - started > budget) return first;
  const ranked = [...args.legal].sort(
    (a, b) => scoreCard(b, args.view, args.legal) - scoreCard(a, args.view, args.legal),
  );
  const best = ranked[0] ?? first;
  const found = searchNormalCard({
    view: args.view,
    candidates: ranked.slice(0, 3),
    rng: args.rng,
    deadline: started + budget,
    now,
    minGap: 40,
  });
  return found ?? best;
}

/** Easy's ordering plus team and trump choices, with no rollout and no random card. */
export function chooseNormalHeuristic(view: PublicBotView, legal: readonly Card[]): Card {
  const first = legal[0];
  if (!first) throw new Error('No legal card');
  return legal.reduce((best, card) => (scoreCard(card, view, legal) > scoreCard(best, view, legal) ? card : best));
}

function scoreCard(card: Card, view: PublicBotView, legal: readonly Card[]): number {
  const leading = view.currentTrick.length === 0;
  const called = view.slots.some((slot) => slot.filledBy === null && cardId(slot.card) === cardId(card));
  let score = -(RANK_VALUE[card.rank] ?? 0);
  if (called && view.trickCount < view.cardsPerPlayer - 1) score -= 40;
  if (leading) return score + leadScore(card, view, legal, called);
  return score + followScore(card, view);
}

function leadScore(card: Card, view: PublicBotView, legal: readonly Card[], called: boolean): number {
  let score = 0;
  if (card.rank === 'A' && card.suit !== view.trump) score += 35;
  const openSuits = new Set(view.slots.filter((slot) => slot.filledBy === null).map((slot) => slot.card.suit));
  const defending = !onTeam(view, view.selfId);
  if (defending && openSuits.has(card.suit) && !called) score += 50;
  if (called && closerToBidder(view) && view.bidAmount - view.revealedTeamPoints <= 30) score += 25;
  const trumpCount = legal.filter((held) => held.suit === view.trump).length;
  if (view.selfId === view.bidderId && card.suit === view.trump && trumpCount >= 4 && card.rank !== 'A') score += 18;
  if (card.suit === view.trump && card.rank === 'A') score -= 12;
  return score;
}

function followScore(card: Card, view: PublicBotView): number {
  const withCard = [...view.currentTrick, { playerId: view.selfId, card }];
  const winner = trickWinner(withCard, view.trump)?.playerId ?? '';
  const current = trickWinner(view.currentTrick, view.trump)?.playerId ?? '';
  const mine = winner === view.selfId;
  const teamHasIt = onTeam(view, current);
  const iAmTeam = onTeam(view, view.selfId);
  const points = view.currentTrick.reduce((sum, play) => sum + cardPointValue(play.card), 0);
  const premium = view.currentTrick.some((play) => play.card.rank === '3' && premiumLive(play.card.suit, view));
  let score = 0;
  if (iAmTeam && teamHasIt && !mine) score += 30;
  if (iAmTeam && teamHasIt && mine && card.suit === view.trump) score -= 35;
  if (!mine && card.suit === view.trump && view.currentTrick[0]?.card.suit !== view.trump) score -= 28;
  if (mine && card.suit === view.trump && points < 10 && !premium) score -= 18;
  if (!iAmTeam && !teamHasIt && mine) score += 45;
  if (mine && points >= 10) score += 25;
  if (mine && premium) score += 70;
  if (!mine && card.suit !== view.currentTrick[0]?.card.suit) score -= 5;
  return score;
}

function closerToBidder(view: PublicBotView): boolean {
  const bidderAt = view.seatOrder.indexOf(view.bidderId);
  const selfAt = view.seatOrder.indexOf(view.selfId);
  if (bidderAt < 0 || selfAt < 0) return false;
  const distance = (selfAt - bidderAt + view.seatOrder.length) % view.seatOrder.length;
  return distance > 0 && distance <= 2;
}

function onTeam(view: PublicBotView, playerId: string): boolean {
  return playerId === view.bidderId || view.revealedPartners.includes(playerId);
}

function premiumLive(suit: Suit, view: PublicBotView): boolean {
  if (suit === 'spades' && !view.premiumAwarded.spades) return true;
  return view.gameType === '500' && suit === 'hearts' && !view.premiumAwarded.hearts;
}
