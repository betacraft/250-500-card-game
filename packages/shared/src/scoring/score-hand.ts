import { rulesFor } from '../games';
import type { GameType } from '../games/types';

export interface ScoreHandInput {
  /** Game variant (250 or 500) */
  gameType: GameType;
  /** Player IDs of all participants */
  allPlayerIds: readonly string[];
  /** Player ID of the bidder */
  bidder: string;
  /** Bid amount (must be valid per the game rules) */
  bidAmount: number;
  /** Player IDs revealed as partners (excluding bidder; 0..N depending on game type) */
  partners: readonly string[];
  /** True if the bidder team made the bid */
  bidMade: boolean;
}

export interface ScoreHandResult {
  /** Per-player score delta for this hand */
  deltas: Record<string, number>;
  /** Bonus applied to bidder (positive if made, negative if failed) */
  bidderBonus: number;
}

/**
 * Compute per-player score deltas for a completed hand.
 *
 * Rules (from RULES.md):
 * - Made bid: bidder gets +bid + bonus (100 for 250, 200 for 500); each partner gets +bid; opponents 0.
 * - Failed bid: bidder gets -bid - bonus; each partner gets -bid; opponents 0.
 * - The bonus is the leadership premium the bidder pays for/earns regardless of partner count.
 * - Empty partner slot (500 edge case): no extra partner score awarded; team has fewer scoring partners.
 */
export function scoreHand(input: ScoreHandInput): ScoreHandResult {
  const rules = rulesFor(input.gameType);
  const sign = input.bidMade ? 1 : -1;
  const bidderBonus = sign * rules.BIDDER_BONUS;
  const bidScore = sign * input.bidAmount;

  const deltas: Record<string, number> = {};
  for (const id of input.allPlayerIds) deltas[id] = 0;

  deltas[input.bidder] = bidScore + bidderBonus;
  for (const partnerId of input.partners) {
    if (partnerId === input.bidder) continue;
    deltas[partnerId] = bidScore;
  }

  return { deltas, bidderBonus };
}

/**
 * Apply a hand's score deltas to a running totals map.
 * Returns a new map; does not mutate input.
 */
export function applyScoreDeltas(
  running: Readonly<Record<string, number>>,
  deltas: Readonly<Record<string, number>>,
): Record<string, number> {
  const out: Record<string, number> = { ...running };
  for (const [id, delta] of Object.entries(deltas)) {
    out[id] = (out[id] ?? 0) + delta;
  }
  return out;
}

/**
 * Players who have reached or exceeded the target score.
 */
export function gameWinners(
  running: Readonly<Record<string, number>>,
  targetScore: number,
): string[] {
  return Object.entries(running)
    .filter(([, score]) => score >= targetScore)
    .map(([id]) => id);
}
