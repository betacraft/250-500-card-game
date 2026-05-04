import { describe, it, expect } from 'vitest';
import { initRoomGame, beginHand, recordBid, recordPass, declare } from './room-game';

const SEATS_6 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

describe('room-game', () => {
  it('beginHand rotates firstBidderId per hand', () => {
    let g = initRoomGame({ gameType: '250', seatOrder: SEATS_6, seed: 1 });
    g = beginHand(g);
    expect(g.firstBidderId).toBe('p1');
    g = { ...g, handsPlayed: 1 };
    g = beginHand(g);
    expect(g.firstBidderId).toBe('p2');
    g = { ...g, handsPlayed: 5 };
    g = beginHand(g);
    expect(g.firstBidderId).toBe('p6');
    g = { ...g, handsPlayed: 6 };
    g = beginHand(g);
    expect(g.firstBidderId).toBe('p1');
  });

  it('initRoomGame creates fresh state with running scores zero', () => {
    const g = initRoomGame({ gameType: '250', seatOrder: SEATS_6 });
    expect(g.phase).toBe('lobby');
    expect(g.handsPlayed).toBe(0);
    expect(Object.values(g.runningScores)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('beginHand transitions phase to bidding and deals hands', () => {
    const g = initRoomGame({ gameType: '250', seatOrder: SEATS_6, seed: 1 });
    const next = beginHand(g);
    expect(next.phase).toBe('bidding');
    expect(next.hand).not.toBeNull();
    expect(next.hand!.hands['p1']).toHaveLength(8);
  });

  it('recordBid validates min, increment, and turn', () => {
    let g = beginHand(initRoomGame({ gameType: '250', seatOrder: SEATS_6, seed: 1 }));
    expect(recordBid(g, 'p2', 165).ok).toBe(false); // not p2's turn
    expect(recordBid(g, 'p1', 100).ok).toBe(false); // below minimum
    expect(recordBid(g, 'p1', 163).ok).toBe(false); // not multiple of 5
    const r = recordBid(g, 'p1', 165);
    expect(r.ok).toBe(true);
  });

  it('auction closes when N-1 players pass; bidder is set', () => {
    let g = beginHand(initRoomGame({ gameType: '250', seatOrder: SEATS_6, seed: 1 }));
    g = recordBid(g, 'p1', 165).ok ? (recordBid(g, 'p1', 165) as any).state : g;
    for (const id of ['p2', 'p3', 'p4', 'p5', 'p6']) {
      const r = recordPass(g, id);
      if (r.ok) g = r.state;
    }
    expect(g.phase).toBe('declaring');
    expect(g.hand!.bidder).toBe('p1');
    expect(g.hand!.bidAmount).toBe(165);
  });

  it('declare requires bidder to be the caller and correct partner count', () => {
    let g = beginHand(initRoomGame({ gameType: '250', seatOrder: SEATS_6, seed: 1 }));
    const bid = recordBid(g, 'p1', 165);
    if (!bid.ok) throw new Error('test setup');
    g = bid.state;
    for (const id of ['p2', 'p3', 'p4', 'p5', 'p6']) {
      const r = recordPass(g, id);
      if (r.ok) g = r.state;
    }
    // wrong caller
    expect(declare(g, 'p2', 'spades', [{ suit: 'hearts', rank: 'Q' }, { suit: 'diamonds', rank: 'K' }]).ok).toBe(false);
    // wrong count (250 needs 2)
    expect(declare(g, 'p1', 'spades', [{ suit: 'hearts', rank: 'Q' }]).ok).toBe(false);
    // valid
    const d = declare(g, 'p1', 'spades', [{ suit: 'hearts', rank: 'Q' }, { suit: 'diamonds', rank: 'K' }]);
    expect(d.ok).toBe(true);
  });
});
