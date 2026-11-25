import type { Card, Suit } from '../cards/types';
import { buildDeck, createRng } from '../cards/deck';
import { declareTrumpAndPartners, finalizeHand, legalPlaysFor, playCard, type GameHand } from '../engine/hand';
import { rulesFor } from '../games';
import { choosePlay } from './easy-play';
import { toPublicView, type PublicBotView } from './public-view';

const SAMPLES = 4;

export interface PlaySearchArgs {
  view: PublicBotView;
  candidates: readonly Card[];
  rng: () => number;
  deadline: number;
  now: () => number;
  /** Smallest seat-margin gap that may replace the heuristic card. */
  minGap?: number;
}

/**
 * Easy-policy rollouts of the remaining tricks.
 * Hidden cards are dealt from the public remainder and skip shown voids.
 * The card is the one with the higher seat margin. A tie keeps the heuristic.
 */
export function searchNormalCard(args: PlaySearchArgs): Card | null {
  if (args.candidates.length < 2) return args.candidates[0] ?? null;
  const rng = createRng(Math.floor(args.rng() * 0x7fffffff) ^ (args.view.trickCount + 1) * 997);
  const totals = new Map<string, { card: Card; sum: number; n: number }>();
  for (const card of args.candidates) totals.set(keyOf(card), { card, sum: 0, n: 0 });
  for (let sample = 0; sample < SAMPLES; sample += 1) {
    if (args.now() >= args.deadline) break;
    const hands = determinize(args.view, rng);
    if (!hands) continue;
    for (const card of args.candidates) {
      if (args.now() >= args.deadline) break;
      const value = rollout(args.view, hands, card);
      const row = totals.get(keyOf(card));
      if (value === null || !row) continue;
      row.sum += value;
      row.n += 1;
    }
  }
  return bestCard(totals, args.minGap ?? 0);
}

/** Shuffle `pool` and deal `counts[i]` cards to `seats[i]`, never a shown void. */
export function dealRespectingVoids(
  pool: readonly Card[],
  seats: readonly string[],
  counts: readonly number[],
  voids: Readonly<Record<string, readonly Suit[]>>,
  rng: () => number,
): Record<string, Card[]> | null {
  const left = shuffled(pool, rng);
  const order = seats
    .map((seat, index) => ({ seat, need: counts[index] ?? 0, voids: (voids[seat] ?? []).length }))
    .sort((a, b) => b.voids - a.voids);
  const used = new Uint8Array(left.length);
  const hands: Record<string, Card[]> = {};
  for (const seat of order) {
    const hand = takeCards(left, used, seat.need, new Set(voids[seat.seat] ?? []));
    if (!hand) return null;
    hands[seat.seat] = hand;
  }
  return hands;
}

function bestCard(totals: Map<string, { card: Card; sum: number; n: number }>, minGap: number): Card | null {
  let best: { card: Card; mean: number } | null = null;
  let second = -Infinity;
  for (const row of totals.values()) {
    if (row.n === 0) continue;
    const mean = row.sum / row.n;
    if (!best || mean > best.mean) {
      second = best?.mean ?? -Infinity;
      best = { card: row.card, mean };
    } else if (mean > second) second = mean;
  }
  if (!best || best.mean < second + minGap) return null;
  return best.card;
}

function determinize(view: PublicBotView, rng: () => number): Record<string, Card[]> | null {
  const seen = new Set<string>();
  for (const card of view.hand) markSeen(seen, card);
  for (const play of view.currentTrick) markSeen(seen, play.card);
  for (const won of view.wonCards) markSeen(seen, won.card);
  const pool = buildDeck(view.gameType).filter((card) => card.id !== undefined && !seen.has(card.id));
  const others = view.seatOrder.filter((seat) => seat !== view.selfId);
  const counts = others.map((seat) => cardsLeft(view, seat));
  const need = counts.reduce((sum, count) => sum + count, 0);
  if (view.hand.length !== cardsLeft(view, view.selfId) || pool.length !== need) return null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const dealt = dealRespectingVoids(pool, others, counts, view.voids, rng);
    if (!dealt) continue;
    return { ...dealt, [view.selfId]: view.hand.map((card) => ({ ...card })) };
  }
  return null;
}

function rollout(view: PublicBotView, hands: Record<string, Card[]>, card: Card): number | null {
  let state = sampleState(view, hands);
  const first = playCard(state, view.selfId, card);
  if (!first.ok) return null;
  state = first.state;
  const cap = rulesFor(view.gameType).TOTAL_CARDS + 2;
  for (let guard = 0; !state.ended && guard < cap; guard += 1) {
    const playerId = state.toPlayerId;
    if (!playerId) return null;
    const legal = legalPlaysFor(state, playerId);
    const choice = choosePlay(legal, { ...toPublicView(state, playerId), rng: () => 1 });
    const next = playCard(state, playerId, choice);
    if (!next.ok) return null;
    state = next.state;
  }
  if (!state.ended) return null;
  return seatMargin(view, finalizeHand(state).scoreDeltas);
}

function sampleState(view: PublicBotView, hands: Record<string, Card[]>): GameHand {
  const seats = view.seatOrder;
  const collected: Record<string, Card[]> = {};
  for (const seat of seats) collected[seat] = [];
  for (const won of view.wonCards) collected[won.playerId]?.push({ ...won.card });
  let state: GameHand = {
    gameType: view.gameType,
    seatOrder: seats,
    hands: cloneHands(hands),
    bidder: view.bidderId,
    bidAmount: view.bidAmount,
    trump: null,
    calledCards: [],
    slots: [],
    partners: new Set(),
    shownPartners: new Set(view.revealedPartners),
    currentTrick: [],
    toPlayerId: view.bidderId,
    collected,
    trickCount: 0,
    ended: false,
    first3sPlayed: { ...view.premiumWinner },
    premiumWinner: { ...view.premiumWinner },
    holdersByCardId: holdersOf(hands),
    voids: copyVoids(view.voids),
  };
  state = declareTrumpAndPartners(state, view.trump, view.calledCards);
  return {
    ...state,
    currentTrick: view.currentTrick.map((play) => ({ playerId: play.playerId, card: { ...play.card } })),
    toPlayerId: view.selfId,
    collected,
    trickCount: view.trickCount,
    slots: view.gameType === '500' ? view.slots.map((slot) => ({ card: { ...slot.card }, filledBy: slot.filledBy })) : state.slots,
    shownPartners: new Set(view.revealedPartners),
    premiumWinner: { ...view.premiumWinner },
    voids: copyVoids(view.voids),
  };
}

function seatMargin(view: PublicBotView, deltas: Record<string, number>): number {
  const own = deltas[view.selfId] ?? 0;
  let sum = 0;
  for (const seat of view.seatOrder) sum += deltas[seat] ?? 0;
  const others = (sum - own) / Math.max(1, view.seatOrder.length - 1);
  return own - others;
}

function cardsLeft(view: PublicBotView, seat: string): number {
  const already = view.currentTrick.some((play) => play.playerId === seat) ? 1 : 0;
  return view.cardsPerPlayer - view.trickCount - already;
}

function takeCards(pool: readonly Card[], used: Uint8Array, need: number, banned: ReadonlySet<Suit>): Card[] | null {
  const hand: Card[] = [];
  for (let n = 0; n < need; n += 1) {
    let found = -1;
    for (let i = 0; i < pool.length; i += 1) {
      const card = pool[i];
      if (used[i] === 1 || !card || banned.has(card.suit)) continue;
      found = i;
      break;
    }
    const card = pool[found];
    if (found < 0 || !card) return null;
    used[found] = 1;
    hand.push(card);
  }
  return hand;
}

function shuffled(pool: readonly Card[], rng: () => number): Card[] {
  const left = pool.slice();
  for (let i = left.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = left[i];
    const b = left[j];
    if (!a || !b) continue;
    left[i] = b;
    left[j] = a;
  }
  return left;
}

function holdersOf(hands: Record<string, Card[]>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const [id, cards] of Object.entries(hands)) {
    for (const card of cards) {
      const key = `${card.rank}${card.suit[0]}`;
      const set = map.get(key) ?? new Set<string>();
      set.add(id);
      map.set(key, set);
    }
  }
  return map;
}

function cloneHands(hands: Record<string, Card[]>): Record<string, Card[]> {
  const copy: Record<string, Card[]> = {};
  for (const [id, cards] of Object.entries(hands)) copy[id] = cards.map((card) => ({ ...card }));
  return copy;
}

function copyVoids(voids: Readonly<Record<string, readonly Suit[]>>): Record<string, Suit[]> {
  const copy: Record<string, Suit[]> = {};
  for (const [seat, suits] of Object.entries(voids)) copy[seat] = suits.slice();
  return copy;
}

function markSeen(seen: Set<string>, card: Card): void {
  if (card.id) seen.add(card.id);
}

function keyOf(card: Card): string {
  return card.id ?? `${card.rank}${card.suit}`;
}
