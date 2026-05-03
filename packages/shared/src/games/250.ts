/**
 * Constants for the 250 variant (6-player Indian trick-taking bidding card game).
 * See RULES.md at project root for the canonical rules.
 */
export const RULES_250 = {
  PLAYER_COUNT: 6,
  CARDS_PER_PLAYER: 8,
  TOTAL_CARDS: 48,
  TOTAL_POINTS: 250,
  MIN_BID: 160,
  MAX_BID: 250,
  BID_INCREMENT: 5,
  PARTNERS_TO_CALL: 2,
  BIDDER_BONUS: 100,
} as const;
