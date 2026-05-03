import { describe, it, expect, beforeEach } from 'vitest';
import { useScorekeeperStore } from './scorekeeper-store';

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

  it('initGame sets settings, currentHand handNumber 1, and zero scores per player', () => {
    useScorekeeperStore.getState().initGame({
      gameType: '250',
      targetScore: 1000,
      players: Array.from({ length: 6 }, (_, i) => ({
        id: `p${i + 1}`,
        name: `P${i + 1}`,
        seat: i + 1,
      })),
    });
    const state = useScorekeeperStore.getState();
    expect(state.settings?.gameType).toBe('250');
    expect(state.settings?.targetScore).toBe(1000);
    expect(state.currentHand?.handNumber).toBe(1);
    expect(Object.values(state.runningScores)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('resetGame clears settings, hands, and scores', () => {
    useScorekeeperStore.getState().initGame({
      gameType: '500',
      targetScore: 1500,
      players: Array.from({ length: 8 }, (_, i) => ({
        id: `p${i + 1}`,
        name: `P${i + 1}`,
        seat: i + 1,
      })),
    });
    useScorekeeperStore.getState().resetGame();
    const state = useScorekeeperStore.getState();
    expect(state.settings).toBeUndefined();
    expect(state.hands).toEqual([]);
  });
});
