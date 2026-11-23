import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { declareTrumpAndPartners, setBidder, startHand } from '../engine/hand';
import { toPublicView } from './public-view';

describe('public bot view', () => {
  it('omits other hands and an unrevealed partner’s points', () => {
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    let state = startHand({ gameType: '500', seatOrder: seats, firstBidderId: 'p1', seed: 2 });
    state = setBidder(state, 'p1', 350);
    state = declareTrumpAndPartners(state, 'clubs', [
      { suit: 'hearts', rank: 'A' },
      { suit: 'diamonds', rank: 'K' },
      { suit: 'spades', rank: 'Q' },
    ]);
    state = {
      ...state,
      collected: {
        ...state.collected,
        p1: [{ suit: 'hearts', rank: 'A', id: 'pub' }],
        p4: [{ suit: 'spades', rank: 'A', id: 'hid' }, { suit: 'spades', rank: 'K', id: 'hid2' }],
      },
    };
    const view = toPublicView(state, 'p2');
    expect(view).not.toHaveProperty('hands');
    expect(view).not.toHaveProperty('collected');
    expect(view.hand.every((card) => state.hands.p2?.some((owned) => owned.id === card.id))).toBe(true);
    expect(view.revealedPartners).toEqual([]);
    expect(view.revealedTeamPoints).toBe(10);
    const source = [
      readFileSync(new URL('./easy-play.ts', import.meta.url), 'utf8'),
      readFileSync(new URL('./easy-bid.ts', import.meta.url), 'utf8'),
    ].join('\n');
    expect(source).not.toMatch(/holdersByCardId|\.collected|state\.hands/);
  });
});
