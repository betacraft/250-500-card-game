import type { Card } from '../cards/types';
import { rulesFor } from '../games';
import { faceOf, serialOf, SEATS, FACES, POINT_OF, STRIDE, suitIndex, type Work } from './normal-model';
import { rollout } from './normal-rollout';
import type { PublicBotView } from './public-view';

/** Hidden deals sampled from the public view. */
export const NORMAL_SAMPLES = 120;
/** Rollouts of the rest of the hand for each legal card, on each deal. */
export const NORMAL_ROLLOUTS = 10;
/** Stop and return the best completed rollout when this elapses. */
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

/** Determinized Monte Carlo. Sees only the public view. One legal card comes back. */
export function chooseNormalPlay(args: NormalPlayArgs): Card {
  const first = args.legal[0];
  if (!first) throw new Error('No legal card');
  if (args.legal.length === 1) return first;
  const work = makeWork(args.view);
  if (!buildKnown(work, args.view)) return first;
  const scores = new Float64Array(args.legal.length);
  const counts = new Int16Array(args.legal.length);
  const serials = args.legal.map((card) => serialOf(card, args.view, work.used, false));
  const deadline = (args.now ?? Date.now)() + (args.budgetMs ?? NORMAL_BUDGET_MS);
  const samples = args.samples ?? NORMAL_SAMPLES;
  const rollouts = args.rollouts ?? NORMAL_ROLLOUTS;
  let evaluated = 0;
  for (let sample = 0; sample < samples; sample += 1) {
    if (evaluated > 0 && (args.now ?? Date.now)() >= deadline) break;
    prepareSample(work, args.rng);
    const start = sample % args.legal.length;
    for (let step = 0; step < args.legal.length; step += 1) {
      if (evaluated > 0 && (args.now ?? Date.now)() >= deadline) break;
      const action = (start + step) % args.legal.length;
      const serial = serials[action] ?? -1;
      if (serial < 0) continue;
      for (let roll = 0; roll < rollouts; roll += 1) scores[action] = (scores[action] ?? 0) + rollout(work, serial, args.rng);
      counts[action] = (counts[action] ?? 0) + 1;
      evaluated += 1;
    }
  }
  return args.legal[bestIndex(scores, counts)] ?? first;
}

function bestIndex(scores: Float64Array, counts: Int16Array): number {
  let best = 0;
  let bestAvg = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < scores.length; i += 1) {
    const n = counts[i] ?? 0;
    if (n === 0) continue;
    const avg = (scores[i] ?? 0) / n;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = i;
    }
  }
  return best;
}

function makeWork(view: PublicBotView): Work {
  const rules = rulesFor(view.gameType);
  const index = new Map(view.seatOrder.map((id, seat) => [id, seat]));
  const work: Work = {
    seats: view.seatOrder.length,
    actor: index.get(view.selfId) ?? 0,
    bidder: index.get(view.bidderId) ?? 0,
    trump: suitIndex(view.trump),
    is500: view.gameType === '500' ? 1 : 0,
    bid: view.bidAmount,
    bonus: rules.BIDDER_BONUS,
    total: rules.TOTAL_CARDS,
    per: rules.CARDS_PER_PLAYER,
    slotCount: view.slots.length,
    poolN: 0,
    trickLen: view.currentTrick.length,
    baseTrickLen: view.currentTrick.length,
    spadesDone: view.premiumWinner.spades ? 1 : 0,
    heartsDone: view.premiumWinner.hearts ? 1 : 0,
    baseSpades: view.premiumWinner.spades ? 1 : 0,
    baseHearts: view.premiumWinner.hearts ? 1 : 0,
    cards: new Int16Array(SEATS * STRIDE),
    counts: new Int8Array(SEATS),
    sampleCards: new Int16Array(SEATS * STRIDE),
    sampleCounts: new Int8Array(SEATS),
    points: new Int16Array(SEATS),
    basePoints: new Int16Array(SEATS),
    partner: new Uint8Array(SEATS),
    basePartner: new Uint8Array(SEATS),
    pool: new Int16Array(rules.TOTAL_CARDS),
    used: new Uint8Array(rules.TOTAL_CARDS),
    remain: new Int8Array(SEATS),
    trickFace: new Int16Array(SEATS),
    trickSeat: new Int8Array(SEATS),
    baseTrickFace: new Int16Array(SEATS),
    baseTrickSeat: new Int8Array(SEATS),
    slotFace: new Int16Array(3),
    slotOwner: new Int8Array(3),
    baseSlotOwner: new Int8Array(3),
    dealt0: new Int8Array(3),
    dealt1: new Int8Array(3),
    seen: new Uint8Array(FACES),
    called: new Int16Array(3),
    calledN: 0,
  };
  view.currentTrick.forEach((play, i) => {
    const face = faceOf(play.card);
    work.baseTrickFace[i] = face;
    work.baseTrickSeat[i] = index.get(play.playerId) ?? 0;
    work.seen[face] = 1;
  });
  for (const won of view.wonCards) {
    const face = faceOf(won.card);
    work.seen[face] = 1;
    const seat = index.get(won.playerId) ?? 0;
    work.basePoints[seat] = (work.basePoints[seat] ?? 0) + (POINT_OF[face] ?? 0);
  }
  const spadeWinner = view.premiumWinner.spades ? index.get(view.premiumWinner.spades) : undefined;
  if (spadeWinner !== undefined) work.basePoints[spadeWinner] = (work.basePoints[spadeWinner] ?? 0) + 30;
  const heartWinner = view.premiumWinner.hearts ? index.get(view.premiumWinner.hearts) : undefined;
  if (view.gameType === '500' && heartWinner !== undefined) work.basePoints[heartWinner] = (work.basePoints[heartWinner] ?? 0) + 30;
  view.revealedPartners.forEach((id) => {
    const seat = index.get(id);
    if (seat !== undefined) work.basePartner[seat] = 1;
  });
  view.slots.forEach((slot, i) => {
    work.slotFace[i] = faceOf(slot.card);
    const owner = slot.filledBy ? index.get(slot.filledBy) : undefined;
    work.baseSlotOwner[i] = owner === undefined ? -1 : owner;
  });
  view.calledCards.forEach((card) => {
    if (work.calledN < 3) {
      work.called[work.calledN] = faceOf(card);
      work.calledN += 1;
    }
  });
  return work;
}

function buildKnown(work: Work, view: PublicBotView): boolean {
  const played = new Int8Array(SEATS);
  const mark = (card: Card, seat: number): boolean => {
    const serial = serialOf(card, view, work.used, true);
    if (serial < 0) return false;
    if (seat === work.actor) {
      const at = work.actor * STRIDE + (work.sampleCounts[work.actor] ?? 0);
      work.sampleCards[at] = serial;
      work.sampleCounts[work.actor] = (work.sampleCounts[work.actor] ?? 0) + 1;
    }
    return true;
  };
  for (const won of view.wonCards) {
    const seat = view.seatOrder.indexOf(won.playerId);
    if (seat < 0 || !mark(won.card, -1)) return false;
    played[seat] = (played[seat] ?? 0) + 1;
  }
  for (const play of view.currentTrick) {
    const seat = view.seatOrder.indexOf(play.playerId);
    if (seat < 0 || !mark(play.card, -1)) return false;
    played[seat] = (played[seat] ?? 0) + 1;
  }
  for (const card of view.hand) if (!mark(card, work.actor)) return false;
  if ((work.sampleCounts[work.actor] ?? 0) !== work.per - (played[work.actor] ?? 0)) return false;
  let need = 0;
  for (let seat = 0; seat < work.seats; seat += 1) {
    const left = work.per - (played[seat] ?? 0);
    work.remain[seat] = left;
    if (seat !== work.actor) need += left;
  }
  work.poolN = 0;
  for (let serial = 0; serial < work.total; serial += 1) {
    if (work.used[serial] === 0) {
      work.pool[work.poolN] = serial;
      work.poolN += 1;
    }
  }
  return work.poolN === need;
}

function prepareSample(work: Work, rng: () => number): void {
  for (let i = work.poolN - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const a = work.pool[i] ?? 0;
    const b = work.pool[j] ?? 0;
    work.pool[i] = b;
    work.pool[j] = a;
  }
  work.sampleCounts.fill(0);
  const selfN = work.remain[work.actor] ?? 0;
  work.sampleCounts[work.actor] = selfN;
  let cursor = 0;
  for (let seat = 0; seat < work.seats; seat += 1) {
    if (seat === work.actor) continue;
    const need = work.remain[seat] ?? 0;
    const base = seat * STRIDE;
    for (let k = 0; k < need; k += 1) {
      work.sampleCards[base + k] = work.pool[cursor] ?? 0;
      cursor += 1;
    }
    work.sampleCounts[seat] = need;
  }
  work.partner.set(work.basePartner);
  if (work.is500 === 0) noteHiddenPartners(work);
  noteDealt(work);
}

function noteHiddenPartners(work: Work): void {
  for (let i = 0; i < work.calledN; i += 1) {
    const face = work.called[i] ?? -1;
    if (face < 0 || work.seen[face] === 1) continue;
    const seat = findFace(work, face);
    if (seat >= 0 && seat !== work.bidder) work.partner[seat] = 1;
  }
}

function noteDealt(work: Work): void {
  work.dealt0.fill(-1);
  work.dealt1.fill(-1);
  for (let slot = 0; slot < work.slotCount; slot += 1) {
    const face = work.slotFace[slot] ?? -1;
    for (let seat = 0; seat < work.seats; seat += 1) if (holdsFace(work, seat, face)) addDealt(work, slot, seat);
    if (work.seen[face] === 1 && (work.baseSlotOwner[slot] ?? -1) < 0) addDealt(work, slot, work.bidder);
  }
}

function findFace(work: Work, face: number): number {
  for (let seat = 0; seat < work.seats; seat += 1) if (holdsFace(work, seat, face)) return seat;
  return -1;
}

function holdsFace(work: Work, seat: number, face: number): boolean {
  const base = seat * STRIDE;
  const n = work.sampleCounts[seat] ?? 0;
  for (let i = 0; i < n; i += 1) if ((work.sampleCards[base + i] ?? 0) % FACES === face) return true;
  return false;
}

function addDealt(work: Work, slot: number, seat: number): void {
  if ((work.dealt0[slot] ?? -1) < 0) work.dealt0[slot] = seat;
  else if ((work.dealt1[slot] ?? -1) < 0 && work.dealt0[slot] !== seat) work.dealt1[slot] = seat;
}

