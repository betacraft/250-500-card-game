import { describe, expect, it } from 'vitest';
import { simulateTable, type TableReport } from './table-sim';

function expectClean(report: TableReport, hands: number): void {
  expect(report.completed).toBe(hands);
  expect(report.illegalMoves).toBe(0);
  expect(report.crashes).toBe(0);
  expect(report.deadlocks).toBe(0);
  expect(report.pointMismatches).toBe(0);
  expect(report.scoreMismatches).toBe(0);
  expect(report.cardMismatches).toBe(0);
}

describe('normal bot sims', () => {
  it('plays 1000 Normal-only hands of each variant', () => {
    for (const gameType of ['250', '500'] as const) {
      const report = simulateTable({ gameType, hands: 1000, seed: 20261123, botFor: () => 'normal' });
      console.info(JSON.stringify({ label: 'normal-only', ...report }));
      expectClean(report, 1000);
    }
  }, 900_000);

  it('rotates Normal and Easy seats for 500 hands of each variant', () => {
    for (const gameType of ['250', '500'] as const) {
      const report = simulateTable({
        gameType,
        hands: 500,
        seed: 20261123,
        botFor: (seat, hand) => ((seat + hand) % 2 === 0 ? 'normal' : 'easy'),
      });
      console.info(JSON.stringify({
        label: 'mixed',
        gameType,
        completed: report.completed,
        normalBidHands: report.normalBidHands,
        normalMakeRate: report.normalBidHands === 0 ? 0 : report.normalBidMade / report.normalBidHands,
        normalMeanBid: report.normalBidHands === 0 ? 0 : report.normalWinningBidSum / report.normalBidHands,
        easyBidHands: report.easyBidHands,
        easyMakeRate: report.easyBidHands === 0 ? 0 : report.easyBidMade / report.easyBidHands,
        easyMeanBid: report.easyBidHands === 0 ? 0 : report.easyWinningBidSum / report.easyBidHands,
        normalAvgScore: report.normalScoreSum / report.hands,
        easyAvgScore: report.easyScoreSum / report.hands,
        normalSeatSamples: report.normalSeatSamples,
        easySeatSamples: report.easySeatSamples,
        moveSamples: report.moveSamples,
        latencyP50Ms: report.latencyP50Ms,
        latencyP95Ms: report.latencyP95Ms,
        searchSamples: report.searchSamples,
        searchP50Ms: report.searchP50Ms,
        searchP95Ms: report.searchP95Ms,
      }));
      expectClean(report, 500);
      expect(report.normalBidHands).toBeGreaterThan(0);
      expect(report.easyBidHands).toBeGreaterThan(0);
    }
  }, 900_000);
});
