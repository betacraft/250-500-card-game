/**
 * Constants for the 500 variant (8-player two-deck game with voluntary partner reveal).
 * See RULES.md at project root for the canonical rules.
 */
export const RULES_500 = {
  PLAYER_COUNT: 8,
  CARDS_PER_PLAYER: 12,
  TOTAL_CARDS: 96,
  TOTAL_POINTS: 500,
  MIN_BID: 300,
  MAX_BID: 500,
  BID_INCREMENT: 5,
  PARTNERS_TO_CALL: 3,
  BIDDER_BONUS: 200,
} as const;
