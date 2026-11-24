import { isAnalyticsEnabled } from './flag';
import { claimFirstHand } from './storage';
import { setAnalyticsContext, track } from './track';

/** The player picked a bot strength. */
export function noteDifficulty(value: string): void {
  track('difficulty_selected', { value });
}

/** A local table is starting. */
export function noteGameStart(game: '250' | '500', difficulty: string): void {
  setAnalyticsContext({ game, mode: 'local', difficulty });
  track('game_start', {});
  noteDifficulty(difficulty);
}

/** The next hand is dealt. */
export function noteHandStart(): void {
  track('hand_start', {});
}

/** One bid or pass. `bid_placed` is the bid event. `amount` is null on a pass. */
export function noteBidPlaced(action: 'bid' | 'pass', amount: number | null): void {
  track('bid_placed', { action, amount });
}

/** A bid or pass, plus auction_won when that action closed the auction. */
export function noteBidResult(action: 'bid' | 'pass', amount: number | null, closed: { human: boolean; bid: number } | null): void {
  noteBidPlaced(action, amount);
  if (closed) noteAuctionWon(closed.human, closed.bid);
}

/** The auction closed. */
export function noteAuctionWon(bidderIsHuman: boolean, bid: number): void {
  track('auction_won', { bidder: bidderIsHuman ? 'human' : 'bot', bid });
}

/** Trump is named and the called cards are committed. */
export function noteCardsCalled(count: number): void {
  track('cards_called', { count });
}

/** The hand has a result. A failed contract also emits contract_failed. */
export function noteHandComplete(made: boolean, bid: number, points: number, bidderIsHuman: boolean, firstHand: boolean): void {
  track('hand_complete', { made, bid, points, bidder_is_human: bidderIsHuman });
  if (!made) track('contract_failed', { bid, points });
  if (!firstHand || !isAnalyticsEnabled()) return;
  if (!claimFirstHand()) return;
  track('first_hand_finished', {});
}

/** The player left a table that had at least one finished hand. */
export function noteGameComplete(winner: string, humanScore: number, handsPlayed: number): void {
  track('game_complete', { winner, human_score: humanScore, hands_played: handsPlayed });
}

/** Highest score on the way out. Ties that include the human are `tie`. */
export function tableWinner(scores: Record<string, number>, humanId: string): { winner: string; humanScore: number } {
  const humanScore = scores[humanId] ?? 0;
  let best = humanScore;
  for (const value of Object.values(scores)) if (value > best) best = value;
  const tied = Object.values(scores).filter((value) => value === best).length > 1;
  if (best === humanScore && tied) return { winner: 'tie', humanScore };
  if (best === humanScore) return { winner: 'human', humanScore };
  return { winner: 'bot', humanScore };
}

/** Scores including a hand that is still on the trick-pause screen. */
export function scoresWithPending(running: Record<string, number>, pending: Record<string, number> | null, scored: boolean): Record<string, number> {
  const scores = { ...running };
  if (!pending || scored) return scores;
  for (const [id, delta] of Object.entries(pending)) scores[id] = (scores[id] ?? 0) + delta;
  return scores;
}

/** Closed auction, or null when bidding continues. */
export function closedBid(phase: string | undefined, bidder: string | null | undefined, bid: number | null | undefined, humanId: string): { human: boolean; bid: number } | null {
  if (phase !== 'declaring' || !bidder || typeof bid !== 'number') return null;
  return { human: bidder === humanId, bid };
}

/** The player left before anyone reached the target. This is not a finished game. */
export function noteAbandoned(handsPlayed: number, humanScore: number, reason: 'new_game' | 'home'): void {
  track('game_abandoned', { hands_played: handsPlayed, human_score: humanScore, reason });
}

/** The player abandoned the table. */
export function noteNewGame(): void {
  track('new_game', {});
  setAnalyticsContext({ game: null, mode: null, difficulty: null });
}

/** A preference changed. The value is the new setting, never a name or email. */
export function noteSettingsChanged(key: string, value: string): void {
  track('settings_changed', { key, value });
}

/**
 * Documented stub. The game is free to play and never calls this.
 * If a future build calls it, the event is only stored locally.
 */
export function trackAdWatched(): void {
  track('ad_watched', {});
}

/** Documented stub. There is no store and this is never called from the UI. */
export function trackPurchase(): void {
  track('purchase', {});
}
