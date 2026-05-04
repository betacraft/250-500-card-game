import { z } from 'zod';
import { gameTypeSchema } from '../games/types';
import { cardSchema } from '../cards/types';

/** A single player at the table. */
export const playerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40),
  seat: z.number().int().min(1),
});
export type Player = z.infer<typeof playerSchema>;

/** Settings selected at the start of a game.
 * Player count is enforced by gameType: 250 requires exactly 6, 500 requires exactly 8. */
export const gameSettingsSchema = z
  .object({
    gameType: gameTypeSchema,
    targetScore: z.number().int().min(100).max(2000),
    players: z.array(playerSchema).min(6).max(8),
  })
  .refine(
    (s) => (s.gameType === '250' ? s.players.length === 6 : s.players.length === 8),
    { message: '250 requires exactly 6 players; 500 requires exactly 8' },
  );
export type GameSettings = z.infer<typeof gameSettingsSchema>;

/** Bid attempt by a player during the bidding round. */
export const bidEntrySchema = z.object({
  playerId: z.string(),
  action: z.enum(['bid', 'pass']),
  amount: z.number().int().optional(),
});
export type BidEntry = z.infer<typeof bidEntrySchema>;

/**
 * In-progress hand state.
 * Sub-fields are populated as the hand progresses (bidding → declaring → result).
 */
export const currentHandSchema = z.object({
  handNumber: z.number().int().min(1),
  bidHistory: z.array(bidEntrySchema).default([]),
  bidder: z.string().optional(),
  bidAmount: z.number().int().optional(),
  trump: z.enum(['spades', 'hearts', 'diamonds', 'clubs']).optional(),
  calledCards: z.array(cardSchema).default([]),
  partners: z.array(z.string()).default([]),
  bidMade: z.boolean().optional(),
});
export type CurrentHand = z.infer<typeof currentHandSchema>;

/** Completed hand record (snapshot of currentHand after applying scores). */
export const handRecordSchema = z.object({
  handNumber: z.number().int().min(1),
  bidder: z.string(),
  bidAmount: z.number().int(),
  trump: z.enum(['spades', 'hearts', 'diamonds', 'clubs']),
  calledCards: z.array(cardSchema),
  partners: z.array(z.string()),
  bidMade: z.boolean(),
  scoreDeltas: z.record(z.string(), z.number().int()),
});
export type HandRecord = z.infer<typeof handRecordSchema>;

/** The full Scorekeeper state, persisted to localStorage. */
export const scorekeeperStateSchema = z.object({
  version: z.literal(1),
  settings: gameSettingsSchema.optional(),
  currentHand: currentHandSchema.optional(),
  hands: z.array(handRecordSchema).default([]),
  runningScores: z.record(z.string(), z.number().int()).default({}),
});
export type ScorekeeperState = z.infer<typeof scorekeeperStateSchema>;
