import { describe, it, expect } from 'vitest';
import {
  currentHighBid,
  passedPlayers,
  isAuctionClosed,
  getAuctionWinner,
  nextBidder,
  validateBid,
  validatePass,
  suggestedNextBid,
} from './state-machine';

const PLAYERS_6 = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
const baseState = {
  gameType: '250' as const,
  playerIds: PLAYERS_6,
  firstBidderId: 'p1',
  bidHistory: [],
};

describe('bidding state machine', () => {
  it('first bidder is firstBidderId on empty history', () => {
    expect(nextBidder(baseState)).toBe('p1');
  });

  it('nextBidder advances to the next player after a bid', () => {
    const state = {
      ...baseState,
      bidHistory: [{ playerId: 'p1', action: 'bid' as const, amount: 165 }],
    };
    expect(nextBidder(state)).toBe('p2');
  });

  it('nextBidder skips passed players', () => {
    const state = {
      ...baseState,
      bidHistory: [
        { playerId: 'p1', action: 'bid' as const, amount: 165 },
        { playerId: 'p2', action: 'pass' as const },
      ],
    };
    expect(nextBidder(state)).toBe('p3');
  });

  it('currentHighBid returns the highest bid', () => {
    const history = [
      { playerId: 'p1', action: 'bid' as const, amount: 165 },
      { playerId: 'p2', action: 'pass' as const },
      { playerId: 'p3', action: 'bid' as const, amount: 175 },
    ];
    expect(currentHighBid(history)?.amount).toBe(175);
    expect(currentHighBid(history)?.playerId).toBe('p3');
  });

  it('passedPlayers returns set of all passers', () => {
    const history = [
      { playerId: 'p1', action: 'pass' as const },
      { playerId: 'p2', action: 'bid' as const, amount: 165 },
      { playerId: 'p3', action: 'pass' as const },
    ];
    expect(passedPlayers(history).size).toBe(2);
    expect(passedPlayers(history).has('p1')).toBe(true);
    expect(passedPlayers(history).has('p3')).toBe(true);
  });

  it('isAuctionClosed: true when 5 of 6 have passed (250)', () => {
    const state = {
      ...baseState,
      bidHistory: [
        { playerId: 'p1', action: 'bid' as const, amount: 165 },
        { playerId: 'p2', action: 'pass' as const },
        { playerId: 'p3', action: 'pass' as const },
        { playerId: 'p4', action: 'pass' as const },
        { playerId: 'p5', action: 'pass' as const },
        { playerId: 'p6', action: 'pass' as const },
      ],
    };
    expect(isAuctionClosed(state)).toBe(true);
    expect(getAuctionWinner(state)?.playerId).toBe('p1');
    expect(getAuctionWinner(state)?.amount).toBe(165);
  });

  it('isAuctionClosed: false when fewer than N-1 have passed', () => {
    const state = {
      ...baseState,
      bidHistory: [
        { playerId: 'p1', action: 'bid' as const, amount: 165 },
        { playerId: 'p2', action: 'pass' as const },
      ],
    };
    expect(isAuctionClosed(state)).toBe(false);
  });

  it('validateBid rejects below minimum', () => {
    const result = validateBid(baseState, 'p1', 100);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('BELOW_MIN');
  });

  it('validateBid rejects bids not multiple of 5', () => {
    const result = validateBid(baseState, 'p1', 163);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NOT_INCREMENT');
  });

  it('validateBid rejects above max', () => {
    const result = validateBid(baseState, 'p1', 255);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('ABOVE_MAX');
  });

  it('validateBid rejects out of turn', () => {
    const result = validateBid(baseState, 'p3', 165);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NOT_YOUR_TURN');
  });

  it('validateBid rejects equal to current high', () => {
    const state = {
      ...baseState,
      bidHistory: [{ playerId: 'p1', action: 'bid' as const, amount: 165 }],
    };
    const result = validateBid(state, 'p2', 165);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('NOT_HIGHER');
  });

  it('validateBid accepts valid first bid', () => {
    const result = validateBid(baseState, 'p1', 165);
    expect(result.ok).toBe(true);
  });

  it('validateBid accepts higher bid by next player', () => {
    const state = {
      ...baseState,
      bidHistory: [{ playerId: 'p1', action: 'bid' as const, amount: 165 }],
    };
    const result = validateBid(state, 'p2', 170);
    expect(result.ok).toBe(true);
  });

  it('validatePass rejects out of turn', () => {
    const result = validatePass(baseState, 'p3');
    expect(result.ok).toBe(false);
  });

  it('validatePass accepts in turn', () => {
    expect(validatePass(baseState, 'p1').ok).toBe(true);
  });

  it('suggestedNextBid: floor when no bids', () => {
    expect(suggestedNextBid(baseState)).toBe(160);
  });

  it('suggestedNextBid: high+increment when bids exist', () => {
    const state = {
      ...baseState,
      bidHistory: [{ playerId: 'p1', action: 'bid' as const, amount: 175 }],
    };
    expect(suggestedNextBid(state)).toBe(180);
  });

  it('500: validateBid uses 500-specific rules (min 300, max 500)', () => {
    const state500 = { ...baseState, gameType: '500' as const };
    expect(validateBid(state500, 'p1', 250).ok).toBe(false);
    expect(validateBid(state500, 'p1', 305).ok).toBe(true);
    expect(validateBid(state500, 'p1', 505).ok).toBe(false);
  });
});
