import { z } from 'zod';
import { gameTypeSchema } from '../games/types';
import { playerSchema } from '../state/scorekeeper';

/** Public room state — no private hand info, safe to broadcast. */
export const roomStateSchema = z.object({
  code: z.string().length(6),
  gameType: gameTypeSchema,
  hostSocketId: z.string(),
  players: z.array(
    playerSchema.extend({
      socketId: z.string(),
      connected: z.boolean(),
    }),
  ),
  capacity: z.number().int(),
  phase: z.enum(['lobby', 'in-game', 'completed']),
});
export type RoomState = z.infer<typeof roomStateSchema>;

export const roomCreateRequestSchema = z.object({
  gameType: gameTypeSchema,
  hostName: z.string().min(1).max(40),
});
export type RoomCreateRequest = z.infer<typeof roomCreateRequestSchema>;

export const roomCreatedSchema = z.object({
  room: roomStateSchema,
  yourSeat: z.number().int().min(1),
});
export type RoomCreated = z.infer<typeof roomCreatedSchema>;

export const roomJoinRequestSchema = z.object({
  code: z.string().length(6),
});
export type RoomJoinRequest = z.infer<typeof roomJoinRequestSchema>;

export const seatClaimRequestSchema = z.object({
  seat: z.number().int().min(1),
  name: z.string().min(1).max(40),
});
export type SeatClaimRequest = z.infer<typeof seatClaimRequestSchema>;

export const roomReconnectRequestSchema = z.object({
  code: z.string().length(6),
  rejoinToken: z.string().min(8).max(64),
});
export type RoomReconnectRequest = z.infer<typeof roomReconnectRequestSchema>;

export const roomCredentialsSchema = z.object({
  code: z.string().length(6),
  rejoinToken: z.string(),
  seat: z.number().int(),
});
export type RoomCredentials = z.infer<typeof roomCredentialsSchema>;

export const errorEventSchema = z.object({
  code: z.enum([
    'ROOM_NOT_FOUND',
    'ROOM_FULL',
    'SEAT_TAKEN',
    'INVALID_PAYLOAD',
    'TOKEN_INVALID',
    'NOT_HOST',
    'INVALID_MOVE',
    'NOT_YOUR_TURN',
    'INTERNAL_ERROR',
  ]),
  message: z.string(),
});
export type ErrorEvent = z.infer<typeof errorEventSchema>;
