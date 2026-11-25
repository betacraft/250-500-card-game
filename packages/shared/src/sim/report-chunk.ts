import { writeFileSync } from 'node:fs';
import { simulateTable, type SeatDifficulty, type TableReport } from './table-sim';

const isChunk = process.argv[1]?.includes('report-chunk') === true;
const [mode, gameType, fromRaw, handsRaw, out] = process.argv.slice(2);
if (isChunk && (!mode || !gameType || !fromRaw || !handsRaw || !out)) {
  throw new Error('usage: report-chunk <normal|mixed> <250|500> <from> <hands> <out>');
}
if (isChunk && mode && gameType && fromRaw && handsRaw && out) runChunk(mode, gameType, fromRaw, handsRaw, out);

function runChunk(mode: string, gameType: string, fromRaw: string, handsRaw: string, out: string): void {
const latencies: number[] = [];
const botFor = (seat: number, hand: number): SeatDifficulty =>
  mode === 'mixed' ? ((seat + hand) % 2 === 0 ? 'normal' : 'easy') : 'normal';
const report = simulateTable({
  gameType: gameType === '500' ? '500' : '250',
  hands: Number(handsRaw),
  from: Number(fromRaw),
  seed: 20261123,
  botFor,
  latencies,
});
  writeFileSync(out, JSON.stringify({ report, latencies }));
  console.info(JSON.stringify({ wrote: out, completed: report.completed, crashes: report.crashes }));
}

export function combineChunks(parts: { report: TableReport; latencies: number[] }[]): TableReport & {
  realBidShare: number;
  meanBid: number;
  makeRate: number;
  normalMakeRate: number;
  normalMeanBid: number;
  easyMakeRate: number;
  easyMeanBid: number;
  normalAvgScore: number;
  easyAvgScore: number;
  scoreMargin: number;
} {
  const base = parts[0]?.report;
  if (!base) throw new Error('no chunks');
  const report: TableReport = { ...base, hands: 0, completed: 0, illegalMoves: 0, crashes: 0, deadlocks: 0, pointMismatches: 0, scoreMismatches: 0, cardMismatches: 0, auctionsWithBid: 0, winningBidSum: 0, madeHands: 0, normalBidHands: 0, normalBidMade: 0, normalWinningBidSum: 0, easyBidHands: 0, easyBidMade: 0, easyWinningBidSum: 0, normalScoreSum: 0, easyScoreSum: 0, normalSeatSamples: 0, easySeatSamples: 0, normalAuctionTurns: 0, normalRealBids: 0, easyAuctionTurns: 0, easyRealBids: 0, moveSamples: 0, searchSamples: 0 };
  const latencies: number[] = [];
  for (const part of parts) {
    report.hands += part.report.hands;
    report.completed += part.report.completed;
    report.illegalMoves += part.report.illegalMoves;
    report.crashes += part.report.crashes;
    report.deadlocks += part.report.deadlocks;
    report.pointMismatches += part.report.pointMismatches;
    report.scoreMismatches += part.report.scoreMismatches;
    report.cardMismatches += part.report.cardMismatches;
    report.auctionsWithBid += part.report.auctionsWithBid;
    report.winningBidSum += part.report.winningBidSum;
    report.madeHands += part.report.madeHands;
    report.normalBidHands += part.report.normalBidHands;
    report.normalBidMade += part.report.normalBidMade;
    report.normalWinningBidSum += part.report.normalWinningBidSum;
    report.easyBidHands += part.report.easyBidHands;
    report.easyBidMade += part.report.easyBidMade;
    report.easyWinningBidSum += part.report.easyWinningBidSum;
    report.normalScoreSum += part.report.normalScoreSum;
    report.easyScoreSum += part.report.easyScoreSum;
    report.normalSeatSamples += part.report.normalSeatSamples;
    report.easySeatSamples += part.report.easySeatSamples;
    report.normalAuctionTurns += part.report.normalAuctionTurns;
    report.normalRealBids += part.report.normalRealBids;
    report.easyAuctionTurns += part.report.easyAuctionTurns;
    report.easyRealBids += part.report.easyRealBids;
    latencies.push(...part.latencies);
  }
  const sorted = latencies.slice().sort((a, b) => a - b);
  report.moveSamples = sorted.length;
  report.latencyP50Ms = percentile(sorted, 0.5);
  report.latencyP95Ms = percentile(sorted, 0.95);
  const normalAvg = report.normalSeatSamples === 0 ? 0 : report.normalScoreSum / report.normalSeatSamples;
  const easyAvg = report.easySeatSamples === 0 ? 0 : report.easyScoreSum / report.easySeatSamples;
  return {
    ...report,
    realBidShare: report.completed === 0 ? 0 : report.auctionsWithBid / report.completed,
    meanBid: report.completed === 0 ? 0 : report.winningBidSum / report.completed,
    makeRate: report.completed === 0 ? 0 : report.madeHands / report.completed,
    normalMakeRate: report.normalBidHands === 0 ? 0 : report.normalBidMade / report.normalBidHands,
    normalMeanBid: report.normalBidHands === 0 ? 0 : report.normalWinningBidSum / report.normalBidHands,
    easyMakeRate: report.easyBidHands === 0 ? 0 : report.easyBidMade / report.easyBidHands,
    easyMeanBid: report.easyBidHands === 0 ? 0 : report.easyWinningBidSum / report.easyBidHands,
    normalAvgScore: normalAvg,
    easyAvgScore: easyAvg,
    scoreMargin: normalAvg - easyAvg,
  };
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index] ?? 0;
}
