import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { declareTrumpAndPartners, playCard, setBidder, startHand } from '../engine/hand';
import { toPublicView, visiblePartners } from './public-view';

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

  it('never lists an unrevealed partner in 250 or 500', () => {
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    let state = startHand({ gameType: '250', seatOrder: seats, firstBidderId: 'p1', seed: 1 });
    state = setBidder(state, 'p1', 180);
    state = {
      ...state,
      holdersByCardId: new Map([
        ['Ah', new Set(['p4'])],
        ['Kd', new Set(['p6'])],
      ]),
      hands: {
        ...state.hands,
        p4: [{ suit: 'hearts', rank: 'A', id: 'ah' }, { suit: 'clubs', rank: '4', id: 'c4' }],
      },
      collected: {
        ...state.collected,
        p4: [{ suit: 'spades', rank: 'A', id: 'hidden-points' }],
      },
    };
    state = declareTrumpAndPartners(state, 'clubs', [
      { suit: 'hearts', rank: 'A' },
      { suit: 'diamonds', rank: 'K' },
    ]);
    expect([...state.partners].sort()).toEqual(['p4', 'p6']);
    expect(visiblePartners(state)).toEqual([]);
    expect(toPublicView(state, 'p2').revealedPartners).toEqual([]);
    expect(toPublicView(state, 'p2').revealedTeamPoints).toBe(0);
    const led = { ...state, toPlayerId: 'p4' };
    const played = playCard(led, 'p4', { suit: 'hearts', rank: 'A', id: 'ah' });
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    expect(visiblePartners(played.state)).toEqual(['p4']);
    expect(toPublicView(played.state, 'p2').revealedPartners).toEqual(['p4']);
    expect(visiblePartners(played.state)).not.toContain('p6');
    const holderView = toPublicView(state, 'p4');
    expect(holderView.revealedPartners).not.toContain('p4');
    expect(holderView).not.toHaveProperty('selfIsPartner');
    expect(JSON.stringify(holderView)).not.toContain("You're a partner");
    expect(JSON.stringify(toPublicView(state, 'p2'))).not.toContain("You're a partner");
  });

  it('hides unfilled 500 partners and lists a double-slot partner once', () => {
    const seats = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    let state = startHand({ gameType: '500', seatOrder: seats, firstBidderId: 'p1', seed: 2 });
    state = setBidder(state, 'p1', 320);
    state = declareTrumpAndPartners(state, 'clubs', [
      { suit: 'hearts', rank: 'A' },
      { suit: 'hearts', rank: 'K' },
      { suit: 'spades', rank: 'A' },
    ]);
    expect(visiblePartners(state)).toEqual([]);
    expect(toPublicView(state, 'p2').revealedPartners).toEqual([]);
    const doubled = {
      ...state,
      slots: [
        { card: { suit: 'hearts' as const, rank: 'A' as const }, filledBy: 'p3' },
        { card: { suit: 'hearts' as const, rank: 'K' as const }, filledBy: 'p3' },
        { card: { suit: 'spades' as const, rank: 'A' as const }, filledBy: null },
      ],
    };
    expect(visiblePartners(doubled)).toEqual(['p3']);
    expect(toPublicView(doubled, 'p2').revealedPartners).toEqual(['p3']);
  });
});
