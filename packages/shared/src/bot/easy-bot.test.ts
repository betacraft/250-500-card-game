import { describe, expect, it } from 'vitest';
import { createRng } from '../cards/deck';
import type { Card } from '../cards/types';
import { chooseBid, chooseCalledCards, chooseTrump } from './easy-bid';
import { choosePlay } from './easy-play';
import { legalPlaysFor, setBidder, startHand, declareTrumpAndPartners } from '../engine/hand';

const hand: Card[] = [
  { suit: 'spades', rank: 'A' },
  { suit: 'spades', rank: 'K' },
  { suit: 'spades', rank: 'Q' },
  { suit: 'spades', rank: '3' },
  { suit: 'spades', rank: '4' },
  { suit: 'hearts', rank: '9' },
  { suit: 'diamonds', rank: '8' },
  { suit: 'clubs', rank: '7' },
];

describe('easy bot', () => {
  it('picks the longest suit and does not call a held ace while another ace is free', () => {
    expect(chooseTrump(hand)).toBe('spades');
    const calls = chooseCalledCards(hand, 'spades', '250');
    expect(calls).toHaveLength(2);
    expect(calls.some((card) => card.suit === 'spades' && card.rank === 'A')).toBe(false);
    expect(calls[0]?.rank).toBe('A');
  });

  it('is deterministic for the same seed', () => {
    const once = chooseBid({ gameType: '500', hand, highBid: null, rng: createRng(42) });
    const twice = chooseBid({ gameType: '500', hand, highBid: null, rng: createRng(42) });
    expect(once).toEqual(twice);
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    let state = startHand({ gameType: '500', seatOrder: seats, firstBidderId: 'p1', seed: 9 });
    state = setBidder(state, 'p1', 300);
    state = declareTrumpAndPartners(state, 'hearts', [
      { suit: 'spades', rank: 'A' },
      { suit: 'diamonds', rank: 'A' },
      { suit: 'clubs', rank: 'A' },
    ]);
    const legal = legalPlaysFor(state, 'p1');
    const view = {
      gameType: '500' as const,
      selfId: 'p1',
      bidderId: 'p1',
      trump: 'hearts' as const,
      slots: state.slots,
      revealedPartners: [],
      seatOrder: seats,
      currentTrick: [],
      trickCount: 0,
      cardsPerPlayer: 12,
      revealedTeamPoints: 0,
      bidAmount: 300,
      premiumAwarded: { spades: false, hearts: false },
    };
    const a = choosePlay(legal, { ...view, rng: createRng(7) });
    const b = choosePlay(legal, { ...view, rng: createRng(7) });
    expect(a).toEqual(b);
  });

  it('bids on the step grid and never above the maximum', () => {
    const decision = chooseBid({ gameType: '250', hand, highBid: 200, rng: createRng(1) });
    if (decision.action === 'bid') {
      expect(decision.amount ?? 0).toBeGreaterThan(200);
      expect((decision.amount ?? 0) % 5).toBe(0);
      expect(decision.amount ?? 0).toBeLessThanOrEqual(250);
    } else {
      expect(decision.action).toBe('pass');
    }
  });
});
