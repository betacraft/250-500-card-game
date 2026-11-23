import { describe, expect, it } from 'vitest';
import {
  declareTrumpAndPartners,
  finalizeHand,
  playCard,
  setBidder,
  startHand,
  type GameHand,
} from './hand';
import type { Card } from '../cards/types';

const SEATS6 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
const SEATS8 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
const QH: Card = { suit: 'hearts', rank: 'Q', id: 'qh-a' };
const QH2: Card = { suit: 'hearts', rank: 'Q', id: 'qh-b' };
const KD: Card = { suit: 'diamonds', rank: 'K', id: 'kd-a' };
const JS: Card = { suit: 'spades', rank: 'J', id: 'js-a' };
const AS: Card = { suit: 'spades', rank: 'A', id: 'as-a' };
const S3: Card = { suit: 'spades', rank: '3', id: 's3-a' };
const S3B: Card = { suit: 'spades', rank: '3', id: 's3-b' };
const CLUB: Card = { suit: 'clubs', rank: '4', id: 'c4' };

function ready(gameType: '250' | '500', bidder = 'p1'): GameHand {
  const seats = gameType === '250' ? SEATS6 : SEATS8;
  let state = startHand({ gameType, seatOrder: seats, firstBidderId: 'p1', seed: 3 });
  state = setBidder(state, bidder, gameType === '250' ? 170 : 350);
  return state;
}

describe('one physical copy', () => {
  it('playing one ace of hearts leaves the other copy', () => {
    let state = ready('500', 'p3');
    const filler = Array.from({ length: 10 }, (_, i) => ({ suit: 'clubs' as const, rank: '4' as const, id: `f${i}` }));
    const aces: Card[] = [
      { suit: 'hearts', rank: 'A', id: 'ah-1' },
      { suit: 'hearts', rank: 'A', id: 'ah-2' },
    ];
    state = declareTrumpAndPartners(state, 'clubs', [KD, JS, { suit: 'diamonds', rank: 'A' }]);
    state = { ...state, hands: { ...state.hands, p3: [...aces, ...filler] }, toPlayerId: 'p3' };
    const played = playCard(state, 'p3', aces[0]!);
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    const left = played.state.hands.p3 ?? [];
    expect(left).toHaveLength(11);
    expect(left.filter((card) => card.rank === 'A' && card.suit === 'hearts')).toHaveLength(1);
  });
});

describe('first-copy 30s go to the trick winner', () => {
  it('team does not score 30 when an opponent won the first 3♠', () => {
    let state = ready('500');
    state = declareTrumpAndPartners(state, 'diamonds', [KD, JS, { suit: 'clubs', rank: 'A' }]);
    state = {
      ...state,
      ended: true,
      premiumWinner: { spades: 'p5', hearts: null },
      collected: { ...state.collected, p1: [S3B], p5: [S3] },
      holdersByCardId: new Map(),
    };
    expect(finalizeHand(state).pointsCollected).toBe(0);
  });

  it('team scores 30 when it won the first 3♠ even if an earlier seat holds the second', () => {
    let state = ready('500');
    state = declareTrumpAndPartners(state, 'diamonds', [KD, JS, { suit: 'clubs', rank: 'A' }]);
    state = {
      ...state,
      ended: true,
      premiumWinner: { spades: 'p8', hearts: null },
      slots: state.slots.map((slot, index) => (index === 0 ? { ...slot, filledBy: 'p8' } : slot)),
      collected: { ...state.collected, p1: [S3B], p8: [S3] },
      holdersByCardId: new Map(),
    };
    expect(finalizeHand(state).pointsCollected).toBe(30);
  });

  it('both copies in one trick pay 30 once and the first played wins', () => {
    let state = ready('500');
    state = declareTrumpAndPartners(state, 'diamonds', [KD, JS, { suit: 'clubs', rank: 'A' }]);
    const hands = { ...state.hands };
    for (const id of SEATS8) hands[id] = [{ suit: 'clubs', rank: '9', id: `x-${id}` }];
    hands.p1 = [S3];
    hands.p2 = [S3B];
    state = { ...state, hands, holdersByCardId: new Map(), toPlayerId: 'p1' };
    let cursor = state;
    let winner: string | null = null;
    for (const id of SEATS8) {
      const card = cursor.hands[id]?.[0];
      if (!card) throw new Error('missing');
      const result = playCard(cursor, id, card);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      cursor = result.state;
      winner = result.trickWinnerId ?? winner;
    }
    expect(winner).toBe('p1');
    expect(finalizeHand({ ...cursor, ended: true }).pointsCollected).toBe(30);
  });
});

describe('partnership split', () => {
  it('250 self-call is fixed at declaration and does not use slots', () => {
    let state = ready('250');
    state = {
      ...state,
      holdersByCardId: new Map([
        ['As', new Set(['p1'])],
        ['Qh', new Set(['p4'])],
      ]),
    };
    state = declareTrumpAndPartners(state, 'diamonds', [AS, QH]);
    expect(state.slots).toEqual([]);
    expect([...state.partners]).toEqual(['p4']);
    state = { ...state, hands: { ...state.hands, p1: [AS, CLUB] }, toPlayerId: 'p1' };
    const led = playCard(state, 'p1', AS);
    expect(led.ok).toBe(true);
    if (!led.ok) return;
    expect([...led.state.partners]).toEqual(['p4']);
    expect(led.newPartner).toBeNull();
  });

  it('250 finalize does not apply clockwise default', () => {
    let state = ready('250');
    state = declareTrumpAndPartners(state, 'clubs', [QH, KD]);
    state = {
      ...state,
      partners: new Set(),
      slots: [{ card: QH, filledBy: null }],
      holdersByCardId: new Map([['Qh', new Set(['p5'])]]),
      ended: true,
    };
    expect(finalizeHand(state).partners).toEqual([]);
  });

  it('bidder playing a called card leaves the 500 slot open for the other holder', () => {
    let state = ready('500');
    state = declareTrumpAndPartners(state, 'clubs', [QH, KD, JS]);
    state = { ...state, hands: { ...state.hands, p1: [QH, CLUB], p4: [QH2, CLUB] }, toPlayerId: 'p1' };
    const bidderPlay = playCard(state, 'p1', QH);
    expect(bidderPlay.ok).toBe(true);
    if (!bidderPlay.ok) return;
    expect(bidderPlay.state.slots[0]?.filledBy).toBeNull();
    const next = {
      ...bidderPlay.state,
      toPlayerId: 'p4',
      currentTrick: [{ playerId: 'p2', card: { suit: 'hearts' as const, rank: '5' as const, id: 'h5' } }],
      hands: { ...bidderPlay.state.hands, p4: [QH2, CLUB] },
    };
    const partnerPlay = playCard(next, 'p4', QH2);
    expect(partnerPlay.ok).toBe(true);
    if (!partnerPlay.ok) return;
    expect(partnerPlay.newPartner).toBe('p4');
    expect(partnerPlay.state.slots[0]?.filledBy).toBe('p4');
  });

  it('one player filling two slots is paid once and the third stays open', () => {
    let state = ready('500');
    state = declareTrumpAndPartners(state, 'clubs', [QH, KD, JS]);
    state = {
      ...state,
      hands: { ...state.hands, p3: [QH, KD, CLUB] },
      toPlayerId: 'p3',
      holdersByCardId: new Map(),
      currentTrick: [{ playerId: 'p1', card: { suit: 'hearts' as const, rank: '4' as const, id: 'lead-h' } }],
    };
    const first = playCard(state, 'p3', QH);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const next = {
      ...first.state,
      toPlayerId: 'p3',
      currentTrick: [{ playerId: 'p1', card: { suit: 'diamonds' as const, rank: '4' as const, id: 'lead-d' } }],
    };
    const second = playCard(next, 'p3', KD);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.newPartner).toBeNull();
    expect(second.state.slots[2]?.filledBy).toBeNull();
    const aces = Array.from({ length: 35 }, (_, i) => ({ suit: 'hearts' as const, rank: 'A' as const, id: `a${i}` }));
    const scored = finalizeHand({
      ...second.state,
      ended: true,
      collected: { ...second.state.collected, p1: aces },
    });
    expect(scored.partners).toEqual(['p3']);
    expect(scored.bidMade).toBe(true);
    expect(scored.scoreDeltas.p1).toBe(550);
    expect(scored.scoreDeltas.p3).toBe(350);
    expect(scored.scoreDeltas.p4).toBe(0);
  });

  it('following suit with the only heart fills the called slot', () => {
    let state = ready('500');
    state = declareTrumpAndPartners(state, 'clubs', [QH, KD, JS]);
    state = {
      ...state,
      currentTrick: [{ playerId: 'p1', card: { suit: 'hearts', rank: '4', id: 'h4' } }],
      toPlayerId: 'p3',
      hands: { ...state.hands, p3: [QH, CLUB] },
    };
    const played = playCard(state, 'p3', QH);
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    expect(played.newPartner).toBe('p3');
  });

  it('500 cannot lead an open called card until the last trick; 250 can', () => {
    let state = ready('500', 'p2');
    state = declareTrumpAndPartners(state, 'clubs', [QH, KD, JS]);
    state = { ...state, hands: { ...state.hands, p3: [QH, CLUB] }, toPlayerId: 'p3', trickCount: 0 };
    const banned = playCard(state, 'p3', QH);
    expect(banned.ok).toBe(false);
    if (!banned.ok) expect(banned.code).toBe('CANNOT_SELF_REVEAL');
    const last = playCard({ ...state, trickCount: 11 }, 'p3', QH);
    expect(last.ok).toBe(true);
    let twoFifty = ready('250', 'p2');
    twoFifty = declareTrumpAndPartners(twoFifty, 'clubs', [QH, KD]);
    twoFifty = { ...twoFifty, hands: { ...twoFifty.hands, p3: [QH, CLUB] }, toPlayerId: 'p3' };
    expect(playCard(twoFifty, 'p3', QH).ok).toBe(true);
  });

  it('a lead of a called card is allowed when every card would self-reveal', () => {
    let state = ready('500', 'p2');
    state = declareTrumpAndPartners(state, 'clubs', [QH, KD, JS]);
    state = { ...state, hands: { ...state.hands, p3: [QH, KD] }, toPlayerId: 'p3', trickCount: 0 };
    expect(playCard(state, 'p3', QH).ok).toBe(true);
  });

  it('clockwise default scores a made 350 as +550 / +350 and can leave a slot empty', () => {
    let state = ready('500');
    state = declareTrumpAndPartners(state, 'clubs', [QH, KD, JS]);
    const aces = Array.from({ length: 35 }, (_, i) => ({ suit: 'spades' as const, rank: 'A' as const, id: `s${i}` }));
    state = {
      ...state,
      ended: true,
      slots: [
        { card: QH, filledBy: null },
        { card: KD, filledBy: null },
        { card: JS, filledBy: null },
      ],
      holdersByCardId: new Map([
        ['Qh', new Set(['p1', 'p4'])],
        ['Kd', new Set(['p1'])],
        ['Js', new Set(['p1'])],
      ]),
      collected: { ...state.collected, p1: aces },
    };
    const scored = finalizeHand(state);
    expect(scored.partners).toEqual(['p4']);
    expect(scored.scoreDeltas.p1).toBe(550);
    expect(scored.scoreDeltas.p4).toBe(350);
    const empty = finalizeHand({ ...state, holdersByCardId: new Map(), collected: { ...state.collected, p1: aces } });
    expect(empty.partners).toEqual([]);
    expect(empty.scoreDeltas.p1).toBe(550);
    expect(empty.scoreDeltas.p2).toBe(0);
  });
});
