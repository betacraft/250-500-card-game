import { describe, expect, it } from 'vitest';
import { simulateHands } from './run-hand';

describe('headless easy-vs-easy sim', () => {
  it('plays 1000 hands of each variant with no illegal moves or point drift', () => {
    for (const gameType of ['250', '500'] as const) {
      const report = simulateHands({ gameType, hands: 1000, seed: 20261123 });
      console.info(JSON.stringify(report));
      expect(report.completed).toBe(1000);
      expect(report.illegalMoves).toBe(0);
      expect(report.crashes).toBe(0);
      expect(report.deadlocks).toBe(0);
      expect(report.pointMismatches).toBe(0);
      expect(report.scoreMismatches).toBe(0);
      expect(report.cardMismatches).toBe(0);
      expect(report.auctionsWithBid / report.completed).toBeGreaterThan(0.5);
      const meanBid = report.winningBidSum / report.completed;
      const makeRate = report.madeHands / report.completed;
      console.info(JSON.stringify({ gameType, bidShare: report.auctionsWithBid / report.completed, meanBid, makeRate }));
    }
  }, 120_000);
});
