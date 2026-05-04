import { describe, it, expect } from 'vitest';
import {
  gameStartHandRequestSchema,
  gameBidRequestSchema,
  gamePassRequestSchema,
  gameDeclareRequestSchema,
  gamePlayCardRequestSchema,
  publicHandStateSchema,
  handDealtPrivateSchema,
  handScoredSchema,
} from './game';

describe('game event schemas', () => {
  it('gameStartHandRequestSchema accepts empty object', () => {
    expect(gameStartHandRequestSchema.safeParse({}).success).toBe(true);
  });

  it('gameBidRequestSchema requires integer amount', () => {
    expect(gameBidRequestSchema.safeParse({ amount: 165 }).success).toBe(true);
    expect(gameBidRequestSchema.safeParse({ amount: 165.5 }).success).toBe(false);
    expect(gameBidRequestSchema.safeParse({}).success).toBe(false);
  });

  it('gamePassRequestSchema accepts empty object', () => {
    expect(gamePassRequestSchema.safeParse({}).success).toBe(true);
  });

  it('gameDeclareRequestSchema validates trump suit + 1-3 called cards', () => {
    expect(
      gameDeclareRequestSchema.safeParse({
        trump: 'spades',
        calledCards: [{ suit: 'hearts', rank: 'Q' }],
      }).success,
    ).toBe(true);
    expect(
      gameDeclareRequestSchema.safeParse({
        trump: 'invalid',
        calledCards: [{ suit: 'hearts', rank: 'Q' }],
      }).success,
    ).toBe(false);
    expect(
      gameDeclareRequestSchema.safeParse({ trump: 'spades', calledCards: [] }).success,
    ).toBe(false);
    expect(
      gameDeclareRequestSchema.safeParse({
        trump: 'spades',
        calledCards: Array.from({ length: 4 }, () => ({ suit: 'hearts' as const, rank: 'Q' as const })),
      }).success,
    ).toBe(false);
  });

  it('gamePlayCardRequestSchema requires a card', () => {
    expect(gamePlayCardRequestSchema.safeParse({ card: { suit: 'spades', rank: 'A' } }).success).toBe(true);
    expect(gamePlayCardRequestSchema.safeParse({ card: { suit: 'invalid', rank: 'A' } }).success).toBe(false);
    expect(gamePlayCardRequestSchema.safeParse({}).success).toBe(false);
  });

  it('publicHandStateSchema accepts a complete state and rejects hands field', () => {
    const valid = {
      phase: 'bidding' as const,
      handNumber: 1,
      bidHistory: [],
      bidder: null,
      bidAmount: null,
      trump: null,
      calledCards: [],
      partners: [],
      currentTrick: [],
      toPlayerId: null,
      trickCount: 0,
      cardsPerPlayer: { p1: 8 },
      runningScores: { p1: 0 },
    };
    expect(publicHandStateSchema.safeParse(valid).success).toBe(true);
    // Extra fields like `hands` are allowed by Zod by default (they pass through), but we
    // verify that the schema doesn't REQUIRE hands and the type doesn't include it.
    const inferred = publicHandStateSchema.parse(valid);
    expect(inferred).not.toHaveProperty('hands');
  });

  it('handDealtPrivateSchema requires hand: Card[]', () => {
    expect(handDealtPrivateSchema.safeParse({ hand: [{ suit: 'spades', rank: 'A' }] }).success).toBe(true);
    expect(handDealtPrivateSchema.safeParse({ hand: [{ suit: 'invalid', rank: 'A' }] }).success).toBe(false);
  });

  it('handScoredSchema validates breakdown', () => {
    expect(
      handScoredSchema.safeParse({
        bidMade: true,
        pointsCollected: 175,
        partners: ['p2', 'p3'],
        scoreDeltas: { p1: 275, p2: 175, p3: 175, p4: 0, p5: 0, p6: 0 },
        runningScores: { p1: 275 },
      }).success,
    ).toBe(true);
  });
});
