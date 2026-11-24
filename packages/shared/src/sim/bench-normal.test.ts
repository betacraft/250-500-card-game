import { describe, expect, it } from 'vitest';
import { createRng } from '../cards/deck';
import { declareTrumpAndPartners, finalizeHand, legalPlaysFor, playCard, setBidder, startHand } from '../engine/hand';
import { rulesFor } from '../games';
import { choosePlay } from '../bot/easy-play';
import { toPublicView } from '../bot/public-view';
import { chooseNormalDeclaration } from '../bot/normal-bid';
import { estimateNormalBid } from '../bot/normal-search';
import { meanCi, simulateTable } from './table-sim';

const rotate = (players: number) => (seat: number, hand: number): 'normal' | 'easy' =>
  (seat + hand) % players === hand % players ? 'normal' : 'easy';

describe('held-out normal vs easy', () => {
  it('trains, then beats Easy on a held-out seed', () => {
    const trainHands = Number(process.env.BENCH_TRAIN ?? 400);
    const held250 = Number(process.env.BENCH_HANDS ?? 2000);
    const held500 = Number(process.env.BENCH_HANDS_500 ?? 4000);
    const train = run('train', 101, { '250': trainHands, '500': trainHands });
    console.info(JSON.stringify({ label: 'train', ...train }));
    const held = run('heldout', 9001, { '250': held250, '500': held500 });
    console.info(JSON.stringify({ label: 'heldout', ...held }));
    const all = runAll(9001, 400);
    console.info(JSON.stringify({ label: 'all-normal', ...all }));
    const calibration = calibrate(9001, 200);
    console.info(JSON.stringify({ label: 'calibration', buckets: calibration }));
    for (const gameType of ['250', '500'] as const) {
      const row = held[gameType];
      if (!row) throw new Error(gameType);
      expect(row.ci.low, gameType).toBeGreaterThan(0);
      expect(row.bidP95).toBeLessThanOrEqual(150);
      expect(row.playP95).toBeLessThanOrEqual(150);
      expect(row.illegal).toBe(0);
      expect(row.crashes).toBe(0);
      expect(row.deadlocks).toBe(0);
    }
  }, 900_000);
});

function run(label: string, seed: number, hands: Record<'250' | '500', number>): Record<string, ReturnType<typeof summarize>> {
  const out: Record<string, ReturnType<typeof summarize>> = {};
  for (const gameType of ['250', '500'] as const) {
    const players = gameType === '250' ? 6 : 8;
    const report = simulateTable({ gameType, hands: hands[gameType], seed, botFor: rotate(players) });
    out[gameType] = summarize(report);
    console.info(JSON.stringify({ label, gameType, ...out[gameType] }));
  }
  return out;
}

function runAll(seed: number, hands: number): Record<string, { completed: number; illegal: number; make: number; meanBid: number }> {
  const out: Record<string, { completed: number; illegal: number; make: number; meanBid: number }> = {};
  for (const gameType of ['250', '500'] as const) {
    const report = simulateTable({ gameType, hands, seed, botFor: () => 'normal' });
    out[gameType] = {
      completed: report.completed,
      illegal: report.illegalMoves + report.crashes + report.deadlocks,
      make: report.normalBidHands === 0 ? 0 : report.normalBidMade / report.normalBidHands,
      meanBid: report.normalBidHands === 0 ? 0 : report.normalWinningBidSum / report.normalBidHands,
    };
  }
  return out;
}

function summarize(report: ReturnType<typeof simulateTable>): {
  ci: { mean: number; low: number; high: number };
  normalMake: number;
  easyMake: number;
  normalBid: number;
  easyBid: number;
  bidShare: number;
  normalAuctions: number;
  easyAuctions: number;
  normalBidRate: number;
  easyBidRate: number;
  normalAsks: number;
  easyAsks: number;
  bidP50: number;
  bidP95: number;
  playP50: number;
  playP95: number;
  illegal: number;
  crashes: number;
  deadlocks: number;
  n: number;
} {
  return {
    ci: meanCi(report.marginSamples),
    normalMake: report.normalBidHands === 0 ? 0 : report.normalBidMade / report.normalBidHands,
    easyMake: report.easyBidHands === 0 ? 0 : report.easyBidMade / report.easyBidHands,
    normalBid: report.normalBidHands === 0 ? 0 : report.normalWinningBidSum / report.normalBidHands,
    easyBid: report.easyBidHands === 0 ? 0 : report.easyWinningBidSum / report.easyBidHands,
    bidShare: report.completed === 0 ? 0 : report.auctionsWithBid / report.completed,
    normalAuctions: report.normalBidHands,
    easyAuctions: report.easyBidHands,
    normalBidRate: report.normalAuctionTurns === 0 ? 0 : report.normalRealBids / report.normalAuctionTurns,
    easyBidRate: report.easyAuctionTurns === 0 ? 0 : report.easyRealBids / report.easyAuctionTurns,
    normalAsks: report.normalAuctionTurns,
    easyAsks: report.easyAuctionTurns,
    bidP50: report.bidP50Ms,
    bidP95: report.bidP95Ms,
    playP50: report.latencyP50Ms,
    playP95: report.latencyP95Ms,
    illegal: report.illegalMoves,
    crashes: report.crashes,
    deadlocks: report.deadlocks,
    n: report.marginSamples.length,
  };
}

function calibrate(seed: number, hands: number): { bucket: string; n: number; predicted: number; actual: number }[] {
  const rows: { p: number; made: boolean }[] = [];
  for (const gameType of ['250', '500'] as const) {
    const rules = rulesFor(gameType);
    for (let i = 0; i < hands; i += 1) {
      const seats = Array.from({ length: rules.PLAYER_COUNT }, (_, index) => `p${index + 1}`);
      const state = startHand({ gameType, seatOrder: seats, firstBidderId: 'p1', seed: seed + i * 17 });
      const hand = state.hands.p1 ?? [];
      const rng = createRng(seed + i);
      const estimate = estimateNormalBid({ gameType, hand, highBid: null, rng, samples: 16 });
      if (estimate.action !== 'bid' || estimate.amount === undefined) continue;
      const declared = chooseNormalDeclaration(hand, gameType);
      let played = setBidder(state, 'p1', estimate.amount);
      played = declareTrumpAndPartners(played, declared.trump, declared.called);
      let guard = 0;
      while (!played.ended && guard < rules.TOTAL_CARDS + 2) {
        guard += 1;
        const playerId = played.toPlayerId;
        if (!playerId) break;
        const legal = legalPlaysFor(played, playerId);
        const card = choosePlay(legal, { ...toPublicView(played, playerId), rng: () => 1 });
        const result = playCard(played, playerId, card);
        if (!result.ok) break;
        played = result.state;
      }
      if (!played.ended) continue;
      rows.push({ p: estimate.makeProbability, made: finalizeHand(played).pointsCollected >= estimate.amount });
    }
  }
  const buckets = [0, 0.25, 0.5, 0.75, 1.01];
  return buckets.slice(0, -1).map((low, index) => {
    const high = buckets[index + 1] ?? 1;
    const group = rows.filter((row) => row.p >= low && row.p < high);
    const predicted = group.length === 0 ? 0 : group.reduce((sum, row) => sum + row.p, 0) / group.length;
    const actual = group.length === 0 ? 0 : group.filter((row) => row.made).length / group.length;
    return { bucket: `${low.toFixed(2)}-${high.toFixed(2)}`, n: group.length, predicted, actual };
  });
}
