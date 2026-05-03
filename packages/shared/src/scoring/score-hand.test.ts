import { describe, it, expect } from 'vitest';
import { scoreHand, applyScoreDeltas, gameWinners } from './score-hand';

const PLAYERS_6 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
const PLAYERS_8 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];

describe('scoreHand — 250', () => {
  it('made bid 175 with 2 partners: bidder +275, partners +175, opponents 0', () => {
    const result = scoreHand({
      gameType: '250',
      allPlayerIds: PLAYERS_6,
      bidder: 'p1',
      bidAmount: 175,
      partners: ['p2', 'p3'],
      bidMade: true,
    });
    expect(result.deltas).toEqual({ p1: 275, p2: 175, p3: 175, p4: 0, p5: 0, p6: 0 });
    expect(result.bidderBonus).toBe(100);
  });

  it('failed bid 175 with 2 partners: bidder -275, partners -175, opponents 0', () => {
    const result = scoreHand({
      gameType: '250',
      allPlayerIds: PLAYERS_6,
      bidder: 'p1',
      bidAmount: 175,
      partners: ['p2', 'p3'],
      bidMade: false,
    });
    expect(result.deltas).toEqual({ p1: -275, p2: -175, p3: -175, p4: 0, p5: 0, p6: 0 });
    expect(result.bidderBonus).toBe(-100);
  });

  it('made bid 250 (max) with 2 partners: bidder +350', () => {
    const result = scoreHand({
      gameType: '250',
      allPlayerIds: PLAYERS_6,
      bidder: 'p1',
      bidAmount: 250,
      partners: ['p2', 'p3'],
      bidMade: true,
    });
    expect(result.deltas.p1).toBe(350);
  });

  it('made bid 165 with only 1 partner (2 vs 4 scenario): only that partner scores', () => {
    const result = scoreHand({
      gameType: '250',
      allPlayerIds: PLAYERS_6,
      bidder: 'p1',
      bidAmount: 165,
      partners: ['p2'],
      bidMade: true,
    });
    expect(result.deltas).toEqual({ p1: 265, p2: 165, p3: 0, p4: 0, p5: 0, p6: 0 });
  });
});

describe('scoreHand — 500', () => {
  it('made bid 350 with 3 partners: bidder +550, each partner +350, opponents 0', () => {
    const result = scoreHand({
      gameType: '500',
      allPlayerIds: PLAYERS_8,
      bidder: 'p1',
      bidAmount: 350,
      partners: ['p2', 'p3', 'p4'],
      bidMade: true,
    });
    expect(result.deltas).toEqual({
      p1: 550, p2: 350, p3: 350, p4: 350,
      p5: 0, p6: 0, p7: 0, p8: 0,
    });
    expect(result.bidderBonus).toBe(200);
  });

  it('failed bid 420: bidder -620, partners -420, opponents 0', () => {
    const result = scoreHand({
      gameType: '500',
      allPlayerIds: PLAYERS_8,
      bidder: 'p1',
      bidAmount: 420,
      partners: ['p2', 'p3', 'p4'],
      bidMade: false,
    });
    expect(result.deltas.p1).toBe(-620);
    expect(result.deltas.p2).toBe(-420);
    expect(result.deltas.p8).toBe(0);
  });

  it('made bid with empty partners (both copies of called card with bidder edge case)', () => {
    const result = scoreHand({
      gameType: '500',
      allPlayerIds: PLAYERS_8,
      bidder: 'p1',
      bidAmount: 350,
      partners: [],
      bidMade: true,
    });
    expect(result.deltas.p1).toBe(550);
    for (const p of ['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']) {
      expect(result.deltas[p]).toBe(0);
    }
  });

  it('made bid 500 (max): bidder +700', () => {
    const result = scoreHand({
      gameType: '500',
      allPlayerIds: PLAYERS_8,
      bidder: 'p1',
      bidAmount: 500,
      partners: ['p2', 'p3', 'p4'],
      bidMade: true,
    });
    expect(result.deltas.p1).toBe(700);
  });
});

describe('applyScoreDeltas', () => {
  it('adds deltas to running totals', () => {
    const running = { p1: 100, p2: 50, p3: -25 };
    const deltas = { p1: 275, p2: 175, p3: 0 };
    expect(applyScoreDeltas(running, deltas)).toEqual({ p1: 375, p2: 225, p3: -25 });
  });

  it('handles new players in deltas', () => {
    const running = { p1: 100 };
    const deltas = { p2: 50 };
    expect(applyScoreDeltas(running, deltas)).toEqual({ p1: 100, p2: 50 });
  });

  it('does not mutate input', () => {
    const running = { p1: 100 };
    applyScoreDeltas(running, { p1: 50 });
    expect(running).toEqual({ p1: 100 });
  });
});

describe('gameWinners', () => {
  it('returns players at or above target', () => {
    const running = { p1: 1000, p2: 500, p3: 1200, p4: 999 };
    expect(gameWinners(running, 1000).sort()).toEqual(['p1', 'p3']);
  });

  it('returns empty array when no one has reached target', () => {
    expect(gameWinners({ p1: 100 }, 1000)).toEqual([]);
  });
});
