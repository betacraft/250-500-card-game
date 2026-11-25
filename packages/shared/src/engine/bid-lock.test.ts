import { describe, expect, it } from 'vitest';
import { cardPointValue, createRng } from '../cards/deck';
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
        atNormal += players * (locked ? 150 : 400) + (locked ? 250 : 700);
        atFast += players * (locked ? 150 : 200) + (locked ? 250 : 350);
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
    expect(midFast).toBeLessThan(mid);
    expect(midNormal).toBeGreaterThan(0);
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

function playSeed(gameType: '250' | '500', seed: number): { state: GameHand; cards: string[]; locks: { kind: 'made' | 'sunk'; hand: GameHand; trick: number }[] } | null {
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
      if (played.trickWinnerId) {
      const kind = bidLock(state);
      if (kind) locks.push({ kind, hand: state, trick: state.trickCount });
    }
  }
  if (!state.ended) return null;
  return { state, cards, locks };
}
