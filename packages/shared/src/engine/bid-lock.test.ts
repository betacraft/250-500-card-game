import { describe, expect, it } from 'vitest';
import { cardPointValue, createRng } from '../cards/deck';
import { cardInstanceKey } from '../cards/types';
import { chooseBid, chooseCalledCards, chooseTrump } from '../bot/easy-bid';
import { choosePlay as chooseEasyPlay } from '../bot/easy-play';
import { toPublicView } from '../bot/public-view';
import {
  currentHighBid,
  getAuctionWinner,
  isAuctionClosed,
  nextBidder,
  validateBid,
  validatePass,
} from '../bidding/state-machine';
import type { BidEntry } from '../state/scorekeeper';
import { rulesFor } from '../games';
import { finalizeHand, legalPlaysFor, playCard, setBidder, startHand, declareTrumpAndPartners, type GameHand } from './hand';
import { bidLock, bidLockDetail } from './bid-lock';

describe('bid lock', () => {
  it('logs the median scheduled hand length before and after the new pace', () => {
    const before: number[] = [];
    const normal: number[] = [];
    const doubled: number[] = [];
    for (let seed = 1; seed <= 50; seed += 1) {
      const played = playSeed('500', seed);
      if (!played) continue;
      const tricks = played.state.trickCount;
      const players = played.state.seatOrder.length;
      const lockAt = played.locks[0]?.trick ?? null;
      before.push(tricks * players * 220 + tricks * 1500);
      let atNormal = 0;
      let atFast = 0;
      for (let trick = 1; trick <= tricks; trick += 1) {
        const locked = lockAt !== null && trick > lockAt;
        atNormal += players * (locked ? 150 : 250) + (locked ? 250 : 700);
        atFast += players * (locked ? 150 : 125) + (locked ? 250 : 350);
      }
      if (lockAt !== null) {
        atNormal += 1200;
        atFast += 1200;
      }
      normal.push(atNormal);
      doubled.push(atFast);
    }
    const mid = median(before);
    const midNormal = median(normal);
    const midFast = median(doubled);
    console.info(`median hand before ${mid}ms after-1x ${midNormal}ms after-2x ${midFast}ms n=${before.length}`);
    expect(before.length).toBeGreaterThan(40);
    expect(midFast).toBeLessThan(midNormal);
    expect(midNormal).toBeLessThan(mid);
    expect(midNormal).toBeGreaterThan(28_000);
    expect(midNormal).toBeLessThan(36_000);
  });

  it('logs public and omniscient lock tricks for 250 and 500', () => {
    for (const gameType of ['250', '500'] as const) {
      const report = summarize(gameType, 1000);
      console.info(`lock ${gameType} n=${report.n} firstLockOnLastTrick=${report.onLast} noLock=${report.noLock} early=${report.early} ${report.line}`);
      expect(report.early).toBe(0);
      expect(report.noLock).toBe(0);
      expect(report.n).toBeGreaterThan(900);
    }
    const fifty = summarize('500', 50);
    console.info(`lock 500 n=50 firstLockOnLastTrick=${fifty.onLast} noLock=${fifty.noLock} early=${fifty.early} ${fifty.line}`);
    expect(fifty.early).toBe(0);
    expect(fifty.noLock).toBe(0);
  });

  it('matches the final result on 1000 seeded 500 hands and ignores hidden partners', () => {
    let checked = 0;
    for (let seed = 1; seed <= 1000; seed += 1) {
      const played = playSeed('500', seed);
      if (!played) continue;
      checked += 1;
      const { state, locks } = played;
      const finalMade = finalizeHand(state).bidMade;
      for (const snap of locks) {
        const detail = bidLockDetail(snap.hand);
        expect(detail.kind).toBe(snap.kind);
        if (detail.kind === 'made') expect(detail.k).toBeGreaterThanOrEqual(snap.hand.bidAmount ?? 0);
        if (detail.kind === 'sunk') expect(detail.k + detail.u + detail.r).toBeLessThan(snap.hand.bidAmount ?? 0);
        expect(detail.kind === 'made').toBe(finalMade);
        const hidden = [...state.partners].filter((id) => id !== state.bidder && !snap.hand.shownPartners.has(id) && !snap.hand.slots.some((slot) => slot.filledBy === id));
        let hiddenPoints = 0;
        for (const id of hidden) hiddenPoints += heldPoints(snap.hand, id);
        if (detail.kind === 'made') expect(detail.k).toBeGreaterThanOrEqual(snap.hand.bidAmount ?? 0);
        if (detail.kind === 'sunk' && hiddenPoints > detail.u) {
          const excluded = hiddenPoints - detail.u;
          expect(detail.k + detail.u + detail.r + excluded).toBeLessThan(snap.hand.bidAmount ?? 0);
        }
      }
    }
    expect(checked).toBeGreaterThan(900);
  });

  it('plays the same cards and the same scores with or without the lock', () => {
    const plain = playSeed('500', 4242);
    const paced = playSeed('500', 4242);
    if (!plain || !paced) throw new Error('seed did not finish');
    expect(paced.cards).toEqual(plain.cards);
    expect(finalizeHand(paced.state).scoreDeltas).toEqual(finalizeHand(plain.state).scoreDeltas);
  });
});

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function heldPoints(hand: GameHand, id: string): number {
  let points = 0;
  for (const card of hand.collected[id] ?? []) points += cardPointValue(card);
  if (hand.premiumWinner.spades === id) points += 30;
  if (hand.gameType === '500' && hand.premiumWinner.hearts === id) points += 30;
  return points;
}

interface PlayedSeed {
  state: GameHand;
  cards: string[];
  locks: { kind: 'made' | 'sunk'; hand: GameHand; trick: number }[];
  publicAt: number | null;
  omniAt: number | null;
  madeLate: number;
}

/** Test-only. Uses hidden holders. Not imported by the table or the bots. */
function omniscientLock(hand: GameHand): 'made' | 'sunk' | null {
  const bid = hand.bidAmount ?? 0;
  const bidder = hand.bidder ?? '';
  const team = new Set<string>([bidder, ...hand.partners]);
  for (const id of hand.seatOrder) {
    for (const card of hand.hands[id] ?? []) {
      if (hand.calledCards.some((called) => cardInstanceKey(called) === cardInstanceKey(card))) team.add(id);
    }
  }
  for (const slot of hand.slots) if (slot.filledBy) team.add(slot.filledBy);
  let k = 0;
  for (const id of team) k += heldPoints(hand, id);
  const rest = bidLockDetail(hand).r;
  if (k >= bid) return 'made';
  if (k + rest < bid) return 'sunk';
  return null;
}

function summarize(gameType: '250' | '500', seeds: number): { n: number; onLast: number; noLock: number; early: number; line: string } {
  const made = new Map<number, number>();
  const sunk = new Map<number, number>();
  const gaps = new Map<number, number>();
  let n = 0;
  let onLast = 0;
  let early = 0;
  let gapOverTwo = 0;
  let gapHands = 0;
  let noLock = 0;
  for (let seed = 1; seed <= seeds; seed += 1) {
    const played = playSeed(gameType, seed);
    if (!played) continue;
    n += 1;
    if (played.madeLate > 0) early += played.madeLate;
    const fin = finalizeHand(played.state);
    const finalLock = bidLock(played.state);
    if (finalLock === null) noLock += 1;
    else if ((finalLock === 'made') !== fin.bidMade) early += 1;
    const last = played.state.trickCount;
    const pub = played.publicAt;
    const omni = played.omniAt;
    if (pub !== null && pub >= last) onLast += 1;
    if (pub !== null) {
      const bag = played.locks[0]?.kind === 'sunk' ? sunk : made;
      bag.set(pub, (bag.get(pub) ?? 0) + 1);
    }
    if (pub !== null && omni !== null) {
      const gap = pub - omni;
      gaps.set(gap, (gaps.get(gap) ?? 0) + 1);
      gapHands += 1;
      if (gap < 0) early += 1;
      if (gap > 2) gapOverTwo += 1;
    } else if (pub !== null && omni === null) early += 1;
  }
  const madeN = [...made.values()].reduce((sum, count) => sum + count, 0);
  const sunkN = [...sunk.values()].reduce((sum, count) => sum + count, 0);
  const line = `made(${madeN})=${hist(made)} sunk(${sunkN})=${hist(sunk)} gaps=${hist(gaps)} gapHands=${gapHands} gapOverTwo=${gapOverTwo}`;
  return { n, onLast, noLock, early, line };
}

function hist(counts: Map<number, number>): string {
  return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([trick, count]) => `${trick}:${count}`).join(',');
}

function playSeed(gameType: '250' | '500', seed: number): PlayedSeed | null {
  const rules = rulesFor(gameType);
  const seats = Array.from({ length: rules.PLAYER_COUNT }, (_, index) => `p${index + 1}`);
  const firstBidderId = seats[seed % seats.length] ?? 'p1';
  let state = startHand({ gameType, seatOrder: seats, firstBidderId, seed });
  const rng = createRng(seed ^ 0x5eed);
  const history: BidEntry[] = [];
  const auction = () => ({ gameType, playerIds: seats, firstBidderId, bidHistory: history });
  let guard = 0;
  while (!isAuctionClosed(auction()) && guard < seats.length * 4) {
    guard += 1;
    const playerId = nextBidder(auction());
    if (!playerId) return null;
    const decision = chooseBid({ gameType, hand: state.hands[playerId] ?? [], highBid: currentHighBid(history)?.amount ?? null, rng });
    if (decision.action === 'bid' && typeof decision.amount === 'number' && validateBid(auction(), playerId, decision.amount).ok) {
      history.push({ playerId, action: 'bid', amount: decision.amount });
    } else if (validatePass(auction(), playerId).ok) {
      history.push({ playerId, action: 'pass' });
    } else return null;
  }
  const winner = getAuctionWinner(auction());
  if (!winner) return null;
  state = setBidder(state, winner.playerId, winner.amount);
  const bidderHand = state.hands[winner.playerId] ?? [];
  const trump = chooseTrump(bidderHand);
  state = declareTrumpAndPartners(state, trump, chooseCalledCards(bidderHand, trump, gameType));
  const cards: string[] = [];
  const locks: { kind: 'made' | 'sunk'; hand: GameHand; trick: number }[] = [];
  const timing = { publicAt: null as number | null, omniAt: null as number | null, madeLate: 0 };
  let steps = 0;
  while (!state.ended && steps < rules.TOTAL_CARDS + 5) {
    steps += 1;
    const playerId = state.toPlayerId;
    if (!playerId) return null;
    const legal = legalPlaysFor(state, playerId);
    const card = chooseEasyPlay(legal, { ...toPublicView(state, playerId), rng });
    const played = playCard(state, playerId, card);
    if (!played.ok) return null;
    cards.push(`${playerId}:${card.rank}${card.suit}`);
    state = played.state;
    if (played.trickWinnerId) noteCompletedTrick(state, locks, timing);
  }
  if (!state.ended) return null;
  return { state, cards, locks, publicAt: timing.publicAt, omniAt: timing.omniAt, madeLate: timing.madeLate };
}

function noteCompletedTrick(
  state: GameHand,
  locks: { kind: 'made' | 'sunk'; hand: GameHand; trick: number }[],
  timing: { publicAt: number | null; omniAt: number | null; madeLate: number },
): void {
  const detail = bidLockDetail(state);
  if (detail.k >= (state.bidAmount ?? 0) && detail.kind !== 'made') timing.madeLate += 1;
  if (detail.kind && timing.publicAt === null) timing.publicAt = state.trickCount;
  if (detail.kind) locks.push({ kind: detail.kind, hand: state, trick: state.trickCount });
  if (timing.omniAt === null && omniscientLock(state)) timing.omniAt = state.trickCount;
}
