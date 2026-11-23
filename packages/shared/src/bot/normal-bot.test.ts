import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRng } from '../cards/deck';
import { declareTrumpAndPartners, legalPlaysFor, setBidder, startHand } from '../engine/hand';
import { chooseNormalBid } from './normal-bid';
import { chooseNormalPlay } from './normal-play';
import { toPublicView } from './public-view';

describe('normal bot', () => {
  it('plays the same card for the same state and seed', () => {
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    let state = startHand({ gameType: '250', seatOrder: seats, firstBidderId: 'p1', seed: 11 });
    state = setBidder(state, 'p1', 180);
    state = declareTrumpAndPartners(state, 'hearts', [
      { suit: 'spades', rank: 'A' },
      { suit: 'diamonds', rank: 'K' },
    ]);
    const legal = legalPlaysFor(state, 'p1');
    const view = toPublicView(state, 'p1');
    const started = Date.now();
    const once = chooseNormalPlay({ view, legal, rng: createRng(99), now: () => 0 });
    const twice = chooseNormalPlay({ view, legal, rng: createRng(99), now: () => 0 });
    console.info(JSON.stringify({ oneDecisionMs: Date.now() - started, card: once.id, legal: legal.length }));
    expect(once.id).toBe(twice.id);
    expect(legal.some((card) => card.id === once.id)).toBe(true);
  });

  it('returns only a legal card, including when a called card cannot be led', () => {
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    let state = startHand({ gameType: '500', seatOrder: seats, firstBidderId: 'p1', seed: 4 });
    state = setBidder(state, 'p1', 320);
    const called = { suit: 'spades' as const, rank: 'A' as const };
    state = declareTrumpAndPartners(state, 'hearts', [
      called,
      { suit: 'diamonds', rank: 'K' },
      { suit: 'clubs', rank: 'Q' },
    ]);
    const other = { suit: 'hearts' as const, rank: '9' as const, id: '500-20' };
    state = {
      ...state,
      toPlayerId: 'p2',
      currentTrick: [],
      hands: { ...state.hands, p2: [{ ...called, id: '500-11' }, other] },
    };
    const legal = legalPlaysFor(state, 'p2');
    expect(legal.map((card) => card.id)).toEqual(['500-20']);
    const card = chooseNormalPlay({
      view: toPublicView(state, 'p2'),
      legal,
      rng: createRng(3),
      now: () => 0,
      samples: 2,
      rollouts: 1,
    });
    expect(card.id).toBe('500-20');
  });

  it('never reads hidden hands, won piles, or unrevealed partners from the engine', () => {
    const names = ['normal-play.ts', 'normal-bid.ts', 'normal-rollout.ts', 'normal-model.ts'];
    const source = names.map((name) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')).join('\n');
    expect(source).not.toMatch(/holdersByCardId|shownPartners|state\.hands|\.collected/);
    expect(source).not.toMatch(/from '\.\.\/engine\/hand'/);
  });

  it('bids deterministically for the same seed', () => {
    const hand = [
      { suit: 'spades' as const, rank: 'A' as const },
      { suit: 'spades' as const, rank: 'K' as const },
      { suit: 'spades' as const, rank: 'Q' as const },
      { suit: 'hearts' as const, rank: '9' as const },
    ];
    const once = chooseNormalBid({ gameType: '250', hand, highBid: null, rng: createRng(5) });
    const twice = chooseNormalBid({ gameType: '250', hand, highBid: null, rng: createRng(5) });
    expect(once).toEqual(twice);
  });
});
