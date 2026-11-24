import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRng } from '../cards/deck';
import { declareTrumpAndPartners, legalPlaysFor, setBidder, startHand } from '../engine/hand';
import { chooseNormalBid } from './normal-bid';
import { dealHidden } from './normal-search';
import { chooseNormalPlay } from './normal-play';
import { dealRespectingVoids } from './normal-play-search';
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

  it('builds the public view without reading another seat\'s hand', () => {
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    let state = startHand({ gameType: '250', seatOrder: seats, firstBidderId: 'p1', seed: 8 });
    state = setBidder(state, 'p1', 170);
    state = declareTrumpAndPartners(state, 'spades', [
      { suit: 'hearts', rank: 'A' },
      { suit: 'clubs', rank: 'K' },
    ]);
    const guarded = guardHiddenHands(state, 'p1');
    const view = toPublicView(guarded, 'p1');
    expect(view.revealedPartners).toEqual([]);
    const legal = legalPlaysFor(state, 'p1');
    const card = chooseNormalPlay({ view, legal, rng: createRng(2), now: () => 0, samples: 2, rollouts: 1 });
    expect(legal.some((item) => item.id === card.id)).toBe(true);
  });

  it('returns inside the move budget after the sample in progress', () => {
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    let state = startHand({ gameType: '250', seatOrder: seats, firstBidderId: 'p1', seed: 11 });
    state = setBidder(state, 'p1', 180);
    state = declareTrumpAndPartners(state, 'hearts', [
      { suit: 'spades', rank: 'A' },
      { suit: 'diamonds', rank: 'K' },
    ]);
    const legal = legalPlaysFor(state, 'p1');
    const view = toPublicView(state, 'p1');
    let reads = 0;
    const now = (): number => {
      reads += 1;
      return reads > 2 ? 10_000 : 0;
    };
    const card = chooseNormalPlay({ view, legal, rng: createRng(4), now, budgetMs: 150, samples: 120, rollouts: 10 });
    expect(legal.some((item) => item.id === card.id)).toBe(true);
    expect(reads).toBeLessThan(40);
    const started = performance.now();
    chooseNormalPlay({ view, legal, rng: createRng(4) });
    expect(performance.now() - started).toBeLessThan(500);
  });

  it('does not deal a shown void into a hidden hand', () => {
    const pool = [
      { suit: 'spades' as const, rank: 'A' as const, id: 'a' },
      { suit: 'hearts' as const, rank: 'K' as const, id: 'b' },
      { suit: 'diamonds' as const, rank: 'Q' as const, id: 'c' },
    ];
    const dealt = dealRespectingVoids(pool, ['p2'], [2], { p2: ['spades'] }, () => 0.2);
    expect(dealt?.p2).toHaveLength(2);
    expect((dealt?.p2 ?? []).every((card) => card.suit !== 'spades')).toBe(true);
    expect(dealRespectingVoids(pool.slice(0, 2), ['p2'], [2], { p2: ['spades'] }, () => 0)).toBeNull();
  });

  it('does not deal a shown void', () => {
    const dealt = dealHidden([13, 25, 0], [0, 2], [[], [0]], () => 0.2);
    expect(dealt?.[1]).toHaveLength(2);
    expect((dealt?.[1] ?? []).every((serial) => Math.floor((serial % 48) / 12) !== 0)).toBe(true);
    expect(dealHidden([0, 1], [0, 2], [[], [0]], () => 0)).toBeNull();
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

function guardHiddenHands<T extends { hands: Record<string, unknown> }>(state: T, selfId: string): T {
  const hands = new Proxy(state.hands, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && prop !== selfId && Object.prototype.hasOwnProperty.call(target, prop)) {
        throw new Error(`hidden hand ${prop}`);
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  return new Proxy(state, {
    get(target, prop, receiver) {
      if (prop === 'hands') return hands;
      return Reflect.get(target, prop, receiver);
    },
  });
}
