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
  it('plays a Normal-only hand of each variant without breaking the rules', () => {
    for (const gameType of ['250', '500'] as const) {
      const report = simulateTable({ gameType, hands: 1, seed: 20261123, botFor: () => 'normal' });
      expectClean(report, 1);
    }
  }, 30_000);

  it('rotates Normal and Easy seats without breaking the rules', () => {
    for (const gameType of ['250', '500'] as const) {
      const report = simulateTable({
        gameType,
        hands: 4,
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
      expectClean(report, 4);
      expect(report.normalBidHands + report.easyBidHands).toBe(4);
    }
  }, 120_000);
});
