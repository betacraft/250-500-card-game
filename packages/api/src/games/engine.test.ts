import { describe, it, expect } from 'vitest';
import { startHand, setBidder, declareTrumpAndPartners, playCard, finalizeHand } from './engine';
import type { Card } from '@250-500/shared';

const SEATS_6 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

describe('GameEngine — startHand', () => {
  it('250: deals 8 cards to each of 6 players', () => {
    const state = startHand({ gameType: '250', seatOrder: SEATS_6, firstBidderId: 'p1', seed: 1 });
    for (const id of SEATS_6) {
      expect(state.hands[id]).toHaveLength(8);
    }
  });

  it('rejects wrong player count', () => {
    expect(() =>
      startHand({ gameType: '250', seatOrder: ['p1', 'p2'], firstBidderId: 'p1' }),
    ).toThrow();
  });

  it('deal is deterministic with seed', () => {
    const a = startHand({ gameType: '250', seatOrder: SEATS_6, firstBidderId: 'p1', seed: 7 });
    const b = startHand({ gameType: '250', seatOrder: SEATS_6, firstBidderId: 'p1', seed: 7 });
    expect(a.hands).toEqual(b.hands);
  });
});

describe('GameEngine — declareTrumpAndPartners', () => {
  it('250: requires 2 called cards', () => {
    let s = startHand({ gameType: '250', seatOrder: SEATS_6, firstBidderId: 'p1', seed: 1 });
    s = setBidder(s, 'p1', 175);
    expect(() => declareTrumpAndPartners(s, 'spades', [{ suit: 'hearts', rank: 'Q' }])).toThrow();
    const ok = declareTrumpAndPartners(s, 'spades', [
      { suit: 'hearts', rank: 'Q' },
      { suit: 'diamonds', rank: 'K' },
    ]);
    expect(ok.trump).toBe('spades');
    expect(ok.slots).toHaveLength(2);
  });
});

describe('GameEngine — playCard validation', () => {
  it('rejects out-of-turn play', () => {
    let s = startHand({ gameType: '250', seatOrder: SEATS_6, firstBidderId: 'p1', seed: 1 });
    s = setBidder(s, 'p1', 175);
    s = declareTrumpAndPartners(s, 'spades', [
      { suit: 'hearts', rank: 'Q' },
      { suit: 'diamonds', rank: 'K' },
    ]);
    const wrongTurn = playCard(s, 'p2', s.hands['p2']![0]!);
    expect(wrongTurn.ok).toBe(false);
    if (!wrongTurn.ok) expect(wrongTurn.code).toBe('NOT_YOUR_TURN');
  });

  it('rejects card not in hand', () => {
    let s = startHand({ gameType: '250', seatOrder: SEATS_6, firstBidderId: 'p1', seed: 1 });
    s = setBidder(s, 'p1', 175);
    s = declareTrumpAndPartners(s, 'spades', [
      { suit: 'hearts', rank: 'Q' },
      { suit: 'diamonds', rank: 'K' },
    ]);
    // Find a card NOT in p1's hand
    const inHand = new Set(s.hands['p1']!.map((c) => `${c.rank}${c.suit}`));
    const fakeCard: Card = { suit: 'spades', rank: 'A' };
    if (inHand.has(`${fakeCard.rank}${fakeCard.suit}`)) {
      // Skip if by chance we picked one in hand
      return;
    }
    const result = playCard(s, 'p1', fakeCard);
    expect(result.ok).toBe(false);
  });
});

describe('GameEngine — full mini hand simulation', () => {
  it('plays an entire hand of 250 to completion', () => {
    let s = startHand({ gameType: '250', seatOrder: SEATS_6, firstBidderId: 'p1', seed: 42 });
    s = setBidder(s, 'p1', 165);
    // Pick the bidder's first card's suit as trump (simplifies test path)
    const firstCard = s.hands['p1']![0]!;
    s = declareTrumpAndPartners(s, firstCard.suit, [
      { suit: 'hearts', rank: 'Q' },
      { suit: 'diamonds', rank: 'K' },
    ]);

    let played = 0;
    while (!s.ended) {
      const playerId = s.toPlayerId!;
      const hand = s.hands[playerId] ?? [];
      // Pick first legal card
      const ledSuit = s.currentTrick[0]?.card.suit ?? null;
      let chosen: Card | undefined = ledSuit
        ? hand.find((c) => c.suit === ledSuit) ?? hand[0]
        : hand[0];
      if (!chosen) break;
      const result = playCard(s, playerId, chosen);
      if (!result.ok) break;
      s = result.state;
      played++;
      if (played > 100) break; // safety
    }
    expect(s.ended).toBe(true);
    expect(s.trickCount).toBe(8);
  });
});

describe('GameEngine — finalize hand scoring', () => {
  it('250 made bid: returns bidMade=true with correct deltas', () => {
    // Construct an artificial completed state
    const s = startHand({ gameType: '250', seatOrder: SEATS_6, firstBidderId: 'p1', seed: 1 });
    const filled = {
      ...s,
      bidder: 'p1',
      bidAmount: 165,
      trump: 'spades' as const,
      calledCards: [{ suit: 'hearts' as const, rank: 'Q' as const }],
      slots: [{ card: { suit: 'hearts' as const, rank: 'Q' as const }, filledBy: 'p2' }],
      partners: new Set(['p2']),
      ended: true,
      collected: {
        p1: Array.from({ length: 18 }, () => ({ suit: 'spades' as const, rank: 'A' as const })),
        p2: [],
        p3: [],
        p4: [],
        p5: [],
        p6: [],
      },
    };
    const holders = new Map<string, ReadonlySet<string>>();
    const result = finalizeHand(filled, holders);
    expect(result.bidMade).toBe(true);
    expect(result.scoreDeltas['p1']).toBe(265); // +165 + 100
    expect(result.scoreDeltas['p2']).toBe(165);
  });
});
