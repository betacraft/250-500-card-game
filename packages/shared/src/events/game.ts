import { z } from 'zod';
import { cardSchema } from '../cards/types';
import { bidEntrySchema } from '../state/scorekeeper';

const suitEnum = z.enum(['spades', 'hearts', 'diamonds', 'clubs']);

export const gameStartHandRequestSchema = z.object({});
export type GameStartHandRequest = z.infer<typeof gameStartHandRequestSchema>;

export const gameBidRequestSchema = z.object({ amount: z.number().int() });
export type GameBidRequest = z.infer<typeof gameBidRequestSchema>;

export const gamePassRequestSchema = z.object({});
export type GamePassRequest = z.infer<typeof gamePassRequestSchema>;

export const gameDeclareRequestSchema = z.object({
  trump: suitEnum,
  calledCards: z.array(cardSchema).min(1).max(3),
});
export type GameDeclareRequest = z.infer<typeof gameDeclareRequestSchema>;

export const gamePlayCardRequestSchema = z.object({ card: cardSchema });
export type GamePlayCardRequest = z.infer<typeof gamePlayCardRequestSchema>;

/** Public game state — never includes other players' hands. */
export const publicHandStateSchema = z.object({
  phase: z.enum(['bidding', 'declaring', 'playing', 'scored']),
  handNumber: z.number().int(),
  bidHistory: z.array(bidEntrySchema),
  bidder: z.string().nullable(),
  bidAmount: z.number().int().nullable(),
  trump: suitEnum.nullable(),
  calledCards: z.array(cardSchema),
  partners: z.array(z.string()),
  currentTrick: z.array(
    z.object({
      playerId: z.string(),
      card: cardSchema,
    }),
  ),
  toPlayerId: z.string().nullable(),
  trickCount: z.number().int(),
  cardsPerPlayer: z.record(z.string(), z.number().int()),
  runningScores: z.record(z.string(), z.number().int()),
});
export type PublicHandState = z.infer<typeof publicHandStateSchema>;

export const handDealtPrivateSchema = z.object({
  hand: z.array(cardSchema),
});
export type HandDealtPrivate = z.infer<typeof handDealtPrivateSchema>;

export const handScoredSchema = z.object({
  bidMade: z.boolean(),
  pointsCollected: z.number().int(),
  partners: z.array(z.string()),
  scoreDeltas: z.record(z.string(), z.number().int()),
  runningScores: z.record(z.string(), z.number().int()),
});
export type HandScored = z.infer<typeof handScoredSchema>;
