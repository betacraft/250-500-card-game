import { describe, it, expect, beforeEach } from 'vitest';
import { useScorekeeperStore } from './scorekeeper-store';
import type { GameSettings } from '@250-500/shared';

const SETTINGS_250: GameSettings = {
  gameType: '250',
  targetScore: 1000,
  players: Array.from({ length: 6 }, (_, i) => ({
    id: `p${i + 1}`,
    name: `P${i + 1}`,
    seat: i + 1,
  })),
};

describe('scorekeeper-store', () => {
  beforeEach(() => {
    useScorekeeperStore.getState().resetGame();
  });

  it('starts in fresh state with no settings or current hand', () => {
    const state = useScorekeeperStore.getState();
    expect(state.settings).toBeUndefined();
    expect(state.currentHand).toBeUndefined();
    expect(state.hands).toEqual([]);
    expect(state.runningScores).toEqual({});
  });

  it('initGame sets settings, currentHand handNumber 1, zero scores per player', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    const state = useScorekeeperStore.getState();
    expect(state.settings?.gameType).toBe('250');
    expect(state.currentHand?.handNumber).toBe(1);
    expect(Object.values(state.runningScores)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('resetGame clears settings, hands, scores', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    useScorekeeperStore.getState().resetGame();
    const state = useScorekeeperStore.getState();
    expect(state.settings).toBeUndefined();
  });

  it('recordBid appends bid entry to current hand bidHistory', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    useScorekeeperStore.getState().recordBid('p1', 165);
    const hand = useScorekeeperStore.getState().currentHand;
    expect(hand?.bidHistory).toHaveLength(1);
    expect(hand?.bidHistory[0]).toEqual({ playerId: 'p1', action: 'bid', amount: 165 });
  });

  it('recordPass appends pass entry', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    useScorekeeperStore.getState().recordPass('p2');
    const hand = useScorekeeperStore.getState().currentHand;
    expect(hand?.bidHistory[0]).toEqual({ playerId: 'p2', action: 'pass' });
  });

  it('closeBidding sets bidder + bidAmount on current hand', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    useScorekeeperStore.getState().closeBidding('p1', 175);
    const hand = useScorekeeperStore.getState().currentHand;
    expect(hand?.bidder).toBe('p1');
    expect(hand?.bidAmount).toBe(175);
  });

  it('declareTrump sets trump on current hand', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    useScorekeeperStore.getState().declareTrump('spades');
    const hand = useScorekeeperStore.getState().currentHand;
    expect(hand?.trump).toBe('spades');
  });

  it('callPartners sets calledCards on current hand', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    useScorekeeperStore.getState().callPartners([
      { suit: 'hearts', rank: 'Q' },
      { suit: 'diamonds', rank: 'K' },
    ]);
    const hand = useScorekeeperStore.getState().currentHand;
    expect(hand?.calledCards).toHaveLength(2);
  });

  it('applyHandResult: made bid - bidder gets +bid+100, partners +bid, opponents 0; appends to hands history; updates runningScores', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    useScorekeeperStore.getState().closeBidding('p1', 175);
    useScorekeeperStore.getState().declareTrump('spades');
    useScorekeeperStore.getState().callPartners([
      { suit: 'hearts', rank: 'Q' },
      { suit: 'diamonds', rank: 'K' },
    ]);
    useScorekeeperStore.getState().applyHandResult(true, ['p2', 'p3']);
    const state = useScorekeeperStore.getState();
    expect(state.runningScores['p1']).toBe(275); // 175 + 100
    expect(state.runningScores['p2']).toBe(175);
    expect(state.runningScores['p3']).toBe(175);
    expect(state.runningScores['p4']).toBe(0);
    expect(state.hands).toHaveLength(1);
    expect(state.hands[0]?.bidMade).toBe(true);
  });

  it('applyHandResult: failed bid produces negative deltas', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    useScorekeeperStore.getState().closeBidding('p1', 200);
    useScorekeeperStore.getState().declareTrump('hearts');
    useScorekeeperStore.getState().callPartners([
      { suit: 'spades', rank: 'A' },
      { suit: 'clubs', rank: 'K' },
    ]);
    useScorekeeperStore.getState().applyHandResult(false, ['p2']);
    const state = useScorekeeperStore.getState();
    expect(state.runningScores['p1']).toBe(-300); // -200 - 100
    expect(state.runningScores['p2']).toBe(-200);
    expect(state.runningScores['p4']).toBe(0);
  });

  it('startNextHand bumps handNumber and clears bidHistory/calledCards', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    useScorekeeperStore.getState().closeBidding('p1', 175);
    useScorekeeperStore.getState().declareTrump('spades');
    useScorekeeperStore.getState().callPartners([
      { suit: 'hearts', rank: 'Q' },
      { suit: 'diamonds', rank: 'K' },
    ]);
    useScorekeeperStore.getState().applyHandResult(true, ['p2', 'p3']);
    useScorekeeperStore.getState().startNextHand();
    const hand = useScorekeeperStore.getState().currentHand;
    expect(hand?.handNumber).toBe(2);
    expect(hand?.bidHistory).toEqual([]);
    expect(hand?.calledCards).toEqual([]);
  });

  it('multi-hand running totals accumulate correctly across 3 hands', () => {
    useScorekeeperStore.getState().initGame(SETTINGS_250);
    // Hand 1: p1 bids 175, makes it
    useScorekeeperStore.getState().closeBidding('p1', 175);
    useScorekeeperStore.getState().declareTrump('spades');
    useScorekeeperStore.getState().callPartners([
      { suit: 'hearts', rank: 'Q' },
      { suit: 'diamonds', rank: 'K' },
    ]);
    useScorekeeperStore.getState().applyHandResult(true, ['p2', 'p3']);
    useScorekeeperStore.getState().startNextHand();
    // Hand 2: p4 bids 200, fails it
    useScorekeeperStore.getState().closeBidding('p4', 200);
    useScorekeeperStore.getState().declareTrump('hearts');
    useScorekeeperStore.getState().callPartners([
      { suit: 'spades', rank: 'A' },
      { suit: 'clubs', rank: 'K' },
    ]);
    useScorekeeperStore.getState().applyHandResult(false, ['p5']);
    useScorekeeperStore.getState().startNextHand();
    // Hand 3: p1 bids 165, makes
    useScorekeeperStore.getState().closeBidding('p1', 165);
    useScorekeeperStore.getState().declareTrump('clubs');
    useScorekeeperStore.getState().callPartners([
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: 'A' },
    ]);
    useScorekeeperStore.getState().applyHandResult(true, ['p2']);
    const state = useScorekeeperStore.getState();
    // p1: +275 (h1) + 0 (h2) + 265 (h3) = 540
    expect(state.runningScores['p1']).toBe(540);
    // p2: +175 (h1) + 0 + 165 = 340
    expect(state.runningScores['p2']).toBe(340);
    // p4: 0 + (-300) + 0 = -300
    expect(state.runningScores['p4']).toBe(-300);
    expect(state.hands).toHaveLength(3);
  });
});
