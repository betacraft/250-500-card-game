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
    const result = finalizeHand(filled);
    expect(result.bidMade).toBe(true);
    expect(result.scoreDeltas['p1']).toBe(265); // +165 + 100
    expect(result.scoreDeltas['p2']).toBe(165);
  });
});

import { buildDeck } from '@250-500/shared';

describe('GameEngine — 500 first-3♠/3♥ scoring (RULES.md: only first played counts)', () => {
  it('only the first played 3♠ awards 30 points (not each copy)', () => {
    // Construct a fully-completed 500 hand where both copies of 3♠ ended up in TEAM-collected piles.
    // Expected: team gets +30 ONCE for 3♠, even though 2 copies are present.
    const seatOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const s = startHand({ gameType: '500', seatOrder, firstBidderId: 'p1', seed: 1 });
    const filled = {
      ...s,
      bidder: 'p1',
      bidAmount: 350,
      trump: 'spades' as const,
      calledCards: [{ suit: 'hearts' as const, rank: 'Q' as const }],
      slots: [{ card: { suit: 'hearts' as const, rank: 'Q' as const }, filledBy: 'p2' }],
      partners: new Set(['p2']),
      ended: true,
      first3sPlayed: { spades: 'p1' as string | null, hearts: null },
      collected: {
        p1: [
          { suit: 'spades' as const, rank: '3' as const },
          { suit: 'spades' as const, rank: '3' as const }, // duplicate copy
        ],
        p2: [], p3: [], p4: [], p5: [], p6: [], p7: [], p8: [],
      },
      holdersByCardId: new Map(),
    };
    const result = finalizeHand(filled);
    // 250 base from cards collected: 0 (3♠ has cardPointValue 0) + 30 once = 30
    // 30 < 350, so bidMade = false. Verify the 30 was added ONCE not twice.
    expect(result.pointsCollected).toBe(30);
  });

  it('500 first 3♥ awards 30 only once', () => {
    const seatOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const s = startHand({ gameType: '500', seatOrder, firstBidderId: 'p1', seed: 1 });
    const filled = {
      ...s,
      bidder: 'p1',
      bidAmount: 350,
      trump: 'spades' as const,
      calledCards: [{ suit: 'hearts' as const, rank: 'Q' as const }],
      slots: [{ card: { suit: 'hearts' as const, rank: 'Q' as const }, filledBy: 'p2' }],
      partners: new Set(['p2']),
      ended: true,
      first3sPlayed: { spades: null, hearts: 'p1' as string | null },
      collected: {
        p1: [
          { suit: 'hearts' as const, rank: '3' as const },
          { suit: 'hearts' as const, rank: '3' as const },
        ],
        p2: [], p3: [], p4: [], p5: [], p6: [], p7: [], p8: [],
      },
      holdersByCardId: new Map(),
    };
    const result = finalizeHand(filled);
    expect(result.pointsCollected).toBe(30);
  });

  it('250 hand: 3♠ collected by team awards 30', () => {
    const seatOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    const s = startHand({ gameType: '250', seatOrder, firstBidderId: 'p1', seed: 1 });
    const filled = {
      ...s,
      bidder: 'p1',
      bidAmount: 165,
      trump: 'spades' as const,
      calledCards: [{ suit: 'hearts' as const, rank: 'Q' as const }],
      slots: [{ card: { suit: 'hearts' as const, rank: 'Q' as const }, filledBy: 'p2' }],
      partners: new Set(['p2']),
      ended: true,
      first3sPlayed: { spades: 'p1' as string | null, hearts: null },
      collected: {
        p1: [{ suit: 'spades' as const, rank: '3' as const }],
        p2: [], p3: [], p4: [], p5: [], p6: [],
      },
      holdersByCardId: new Map(),
    };
    const result = finalizeHand(filled);
    expect(result.pointsCollected).toBe(30);
  });

  it('500 deck total points = 500 (verifies totals via summed cardPointValue + first3s bonuses)', () => {
    const deck = buildDeck('500');
    expect(deck).toHaveLength(96);
    // Total point sum: cardPointValue gives 0 for all 3s, so we need to add 30 once for 3♠ and 30 once for 3♥
    let total = 0;
    for (const c of deck) {
      if (c.rank === 'A' || c.rank === 'K' || c.rank === 'Q' || c.rank === 'J' || c.rank === '10') total += 10;
      else if (c.rank === '5') total += 5;
    }
    // 5 ranks × 4 suits × 2 decks × 10 = 400 + 4 × 2 × 5 = 40 = 440
    expect(total).toBe(440);
    expect(total + 30 + 30).toBe(500); // first 3♠ + first 3♥
  });
});

describe('GameEngine — clockwise-default rule (RULES.md mandate, regression for #3)', () => {
  it('uses captured holdersByCardId to fill unrevealed slot via closest non-bidder clockwise', () => {
    const seatOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    // Build a state where Q♥ was never played (filledBy null) and we know p4 holds it
    const holders = new Map<string, Set<string>>();
    holders.set('Qh', new Set(['p4'])); // only p4 holds Q♥
    const s = startHand({ gameType: '500', seatOrder, firstBidderId: 'p1', seed: 1 });
    const filled = {
      ...s,
      bidder: 'p1',
      bidAmount: 350,
      trump: 'spades' as const,
      calledCards: [{ suit: 'hearts' as const, rank: 'Q' as const }],
      slots: [{ card: { suit: 'hearts' as const, rank: 'Q' as const }, filledBy: null }],
      partners: new Set<string>(),
      ended: true,
      first3sPlayed: { spades: null, hearts: null },
      collected: { p1: [], p2: [], p3: [], p4: [], p5: [], p6: [], p7: [], p8: [] },
      holdersByCardId: holders,
    };
    const result = finalizeHand(filled);
    // p4 is the closest non-bidder holder → defaulted in as partner
    expect(result.partners).toEqual(['p4']);
  });

  it('clockwise-default skips bidder even if bidder is the closest holder', () => {
    const seatOrder = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const holders = new Map<string, Set<string>>();
    holders.set('Qh', new Set(['p1', 'p5'])); // bidder + p5 hold Q♥
    const s = startHand({ gameType: '500', seatOrder, firstBidderId: 'p1', seed: 1 });
    const filled = {
      ...s,
      bidder: 'p1',
      bidAmount: 350,
      trump: 'spades' as const,
      calledCards: [{ suit: 'hearts' as const, rank: 'Q' as const }],
      slots: [{ card: { suit: 'hearts' as const, rank: 'Q' as const }, filledBy: null }],
      partners: new Set<string>(),
      ended: true,
      first3sPlayed: { spades: null, hearts: null },
      collected: { p1: [], p2: [], p3: [], p4: [], p5: [], p6: [], p7: [], p8: [] },
      holdersByCardId: holders,
    };
    const result = finalizeHand(filled);
    expect(result.partners).toEqual(['p5']);
  });
});
