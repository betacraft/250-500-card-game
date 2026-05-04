import { describe, it, expect } from 'vitest';
import {
  roomCreateRequestSchema,
  roomJoinRequestSchema,
  seatClaimRequestSchema,
  roomReconnectRequestSchema,
  errorEventSchema,
  roomStateSchema,
  roomCreatedSchema,
} from './types';

describe('event schemas', () => {
  it('roomCreateRequestSchema: valid + invalid', () => {
    expect(roomCreateRequestSchema.safeParse({ gameType: '250', hostName: 'A' }).success).toBe(true);
    expect(roomCreateRequestSchema.safeParse({ gameType: 'invalid', hostName: 'A' }).success).toBe(false);
    expect(roomCreateRequestSchema.safeParse({ gameType: '250', hostName: '' }).success).toBe(false);
    expect(roomCreateRequestSchema.safeParse({ gameType: '250', hostName: 'a'.repeat(50) }).success).toBe(false);
  });

  it('roomJoinRequestSchema: requires 6-char code', () => {
    expect(roomJoinRequestSchema.safeParse({ code: 'ABCDEF' }).success).toBe(true);
    expect(roomJoinRequestSchema.safeParse({ code: 'ABC' }).success).toBe(false);
    expect(roomJoinRequestSchema.safeParse({ code: 'TOOLONG' }).success).toBe(false);
  });

  it('seatClaimRequestSchema: valid + invalid', () => {
    expect(seatClaimRequestSchema.safeParse({ seat: 1, name: 'A' }).success).toBe(true);
    expect(seatClaimRequestSchema.safeParse({ seat: 0, name: 'A' }).success).toBe(false);
    expect(seatClaimRequestSchema.safeParse({ seat: 1, name: '' }).success).toBe(false);
  });

  it('roomReconnectRequestSchema: requires both code and rejoinToken', () => {
    expect(roomReconnectRequestSchema.safeParse({ code: 'ABCDEF', rejoinToken: 'a'.repeat(24) }).success).toBe(true);
    expect(roomReconnectRequestSchema.safeParse({ code: 'ABCDEF' }).success).toBe(false);
    expect(roomReconnectRequestSchema.safeParse({ code: 'ABCDEF', rejoinToken: 'short' }).success).toBe(false);
  });

  it('errorEventSchema: only known codes accepted', () => {
    expect(errorEventSchema.safeParse({ code: 'ROOM_NOT_FOUND', message: 'x' }).success).toBe(true);
    expect(errorEventSchema.safeParse({ code: 'TOKEN_INVALID', message: 'x' }).success).toBe(true);
    expect(errorEventSchema.safeParse({ code: 'UNKNOWN_CODE', message: 'x' }).success).toBe(false);
  });

  it('roomStateSchema: full payload', () => {
    const valid = {
      code: 'ABCDEF',
      gameType: '250' as const,
      hostSocketId: 's1',
      players: [{ id: 'p1', name: 'A', seat: 1, socketId: 's1', connected: true }],
      capacity: 6,
      phase: 'lobby' as const,
    };
    expect(roomStateSchema.safeParse(valid).success).toBe(true);
    expect(roomStateSchema.safeParse({ ...valid, phase: 'invalid' }).success).toBe(false);
  });

  it('roomCreatedSchema: room + yourSeat', () => {
    const valid = {
      room: {
        code: 'ABCDEF',
        gameType: '250' as const,
        hostSocketId: 's1',
        players: [],
        capacity: 6,
        phase: 'lobby' as const,
      },
      yourSeat: 1,
    };
    expect(roomCreatedSchema.safeParse(valid).success).toBe(true);
  });
});
