import { describe, it, expect } from 'vitest';
import {
  playerSchema,
  gameSettingsSchema,
  scorekeeperStateSchema,
  handRecordSchema,
} from './scorekeeper';

describe('scorekeeper schemas', () => {
  it('playerSchema accepts valid player', () => {
    const result = playerSchema.safeParse({ id: 'p1', name: 'Mayuresh', seat: 1 });
    expect(result.success).toBe(true);
  });

  it('playerSchema rejects empty name', () => {
    const result = playerSchema.safeParse({ id: 'p1', name: '', seat: 1 });
    expect(result.success).toBe(false);
  });

  it('playerSchema rejects name > 40 chars', () => {
    const result = playerSchema.safeParse({
      id: 'p1',
      name: 'x'.repeat(41),
      seat: 1,
    });
    expect(result.success).toBe(false);
  });

  it('gameSettingsSchema: 250 requires exactly 6 players', () => {
    const players = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, seat: i + 1 }));
    expect(gameSettingsSchema.safeParse({ gameType: '250', targetScore: 1000, players: players(5) }).success).toBe(false);
    expect(gameSettingsSchema.safeParse({ gameType: '250', targetScore: 1000, players: players(6) }).success).toBe(true);
    expect(gameSettingsSchema.safeParse({ gameType: '250', targetScore: 1000, players: players(7) }).success).toBe(false);
    expect(gameSettingsSchema.safeParse({ gameType: '250', targetScore: 1000, players: players(8) }).success).toBe(false);
  });

  it('gameSettingsSchema: 500 requires exactly 8 players', () => {
    const players = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, seat: i + 1 }));
    expect(gameSettingsSchema.safeParse({ gameType: '500', targetScore: 1000, players: players(6) }).success).toBe(false);
    expect(gameSettingsSchema.safeParse({ gameType: '500', targetScore: 1000, players: players(7) }).success).toBe(false);
    expect(gameSettingsSchema.safeParse({ gameType: '500', targetScore: 1000, players: players(8) }).success).toBe(true);
    expect(gameSettingsSchema.safeParse({ gameType: '500', targetScore: 1000, players: players(9) }).success).toBe(false);
  });

  it('scorekeeperStateSchema accepts a fresh state', () => {
    const result = scorekeeperStateSchema.safeParse({
      version: 1,
      hands: [],
      runningScores: {},
    });
    expect(result.success).toBe(true);
  });

  it('handRecordSchema accepts a complete hand record', () => {
    const result = handRecordSchema.safeParse({
      handNumber: 1,
      bidder: 'p1',
      bidAmount: 175,
      trump: 'spades',
      calledCards: [
        { suit: 'hearts', rank: 'Q' },
        { suit: 'diamonds', rank: 'K' },
      ],
      partners: ['p2', 'p3'],
      bidMade: true,
      scoreDeltas: { p1: 275, p2: 175, p3: 175, p4: 0, p5: 0, p6: 0 },
    });
    expect(result.success).toBe(true);
  });
});
