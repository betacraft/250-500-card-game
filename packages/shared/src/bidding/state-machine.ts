import type { BidEntry } from '../state/scorekeeper';
import type { GameType } from '../games/types';
import { rulesFor } from '../games';

export type BidValidationResult =
  | { ok: true }
  | { ok: false; code: 'BELOW_MIN' | 'NOT_INCREMENT' | 'NOT_HIGHER' | 'ABOVE_MAX' | 'NOT_YOUR_TURN' | 'ALREADY_PASSED'; message: string };

interface AuctionState {
  gameType: GameType;
  playerIds: readonly string[];
  /** Player who starts the auction (typically left of dealer) */
  firstBidderId: string;
  bidHistory: readonly BidEntry[];
}

/** Returns the current high bid amount and bidder, or null if no bids placed yet. */
export function currentHighBid(history: readonly BidEntry[]): { amount: number; playerId: string } | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]!;
    if (entry.action === 'bid' && typeof entry.amount === 'number') {
      return { amount: entry.amount, playerId: entry.playerId };
    }
  }
  return null;
}

/** Set of player ids that have already passed and are out of the auction. */
export function passedPlayers(history: readonly BidEntry[]): Set<string> {
  const passed = new Set<string>();
  for (const entry of history) {
    if (entry.action === 'pass') passed.add(entry.playerId);
  }
  return passed;
}

/** True when N-1 of the players have passed (exactly 1 active bidder remains). */
export function isAuctionClosed(state: AuctionState): boolean {
  const passed = passedPlayers(state.bidHistory);
  return passed.size >= state.playerIds.length - 1 && state.bidHistory.length > 0;
}

/** Returns the auction winner, or null if not closed. Winner is the last non-passing player. */
export function getAuctionWinner(state: AuctionState): { playerId: string; amount: number } | null {
  if (!isAuctionClosed(state)) return null;
  const passed = passedPlayers(state.bidHistory);
  const remaining = state.playerIds.find((id) => !passed.has(id));
  if (!remaining) return null;
  const high = currentHighBid(state.bidHistory);
  if (!high || high.playerId !== remaining) {
    const min = rulesFor(state.gameType).MIN_BID;
    return { playerId: remaining, amount: high?.amount ?? min };
  }
  return { playerId: remaining, amount: high.amount };
}

/** Returns the next player who should act. Skips players who have passed. */
export function nextBidder(state: AuctionState): string | null {
  if (isAuctionClosed(state)) return null;
  const passed = passedPlayers(state.bidHistory);
  const lastEntry = state.bidHistory[state.bidHistory.length - 1];
  const startIndex = lastEntry
    ? (state.playerIds.indexOf(lastEntry.playerId) + 1) % state.playerIds.length
    : state.playerIds.indexOf(state.firstBidderId);
  for (let offset = 0; offset < state.playerIds.length; offset++) {
    const idx = (startIndex + offset) % state.playerIds.length;
    const candidate = state.playerIds[idx];
    if (candidate && !passed.has(candidate)) return candidate;
  }
  return null;
}

/** Validates a bid attempt. Returns ok:true or an error code. */
export function validateBid(
  state: AuctionState,
  playerId: string,
  amount: number,
): BidValidationResult {
  const rules = rulesFor(state.gameType);
  const turn = nextBidder(state);
  if (turn !== playerId) return { ok: false, code: 'NOT_YOUR_TURN', message: `It is ${turn ?? 'no one'}'s turn to bid.` };
  if (passedPlayers(state.bidHistory).has(playerId))
    return { ok: false, code: 'ALREADY_PASSED', message: 'You have already passed.' };
  if (amount < rules.MIN_BID)
    return { ok: false, code: 'BELOW_MIN', message: `Minimum bid is ${rules.MIN_BID}.` };
  if (amount > rules.MAX_BID)
    return { ok: false, code: 'ABOVE_MAX', message: `Maximum bid is ${rules.MAX_BID}.` };
  if (amount % rules.BID_INCREMENT !== 0)
    return { ok: false, code: 'NOT_INCREMENT', message: `Bid must be a multiple of ${rules.BID_INCREMENT}.` };
  const high = currentHighBid(state.bidHistory);
  if (high && amount <= high.amount)
    return { ok: false, code: 'NOT_HIGHER', message: `Bid must be higher than ${high.amount}.` };
  return { ok: true };
}

/** Validates a pass attempt — just checks turn and not-already-passed. */
export function validatePass(state: AuctionState, playerId: string): BidValidationResult {
  const turn = nextBidder(state);
  if (turn !== playerId) return { ok: false, code: 'NOT_YOUR_TURN', message: `It is ${turn ?? 'no one'}'s turn.` };
  if (passedPlayers(state.bidHistory).has(playerId))
    return { ok: false, code: 'ALREADY_PASSED', message: 'You have already passed.' };
  return { ok: true };
}

/** Suggested next bid amount = current high + increment, or min if no bids yet. */
export function suggestedNextBid(state: AuctionState): number {
  const rules = rulesFor(state.gameType);
  const high = currentHighBid(state.bidHistory);
  if (!high) return rules.MIN_BID;
  return Math.min(high.amount + rules.BID_INCREMENT, rules.MAX_BID);
}
