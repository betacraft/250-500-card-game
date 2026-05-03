import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  scorekeeperStateSchema,
  type ScorekeeperState,
  type GameSettings,
  type Player,
  type GameType,
} from '@250-500/shared';

interface ScorekeeperActions {
  initGame: (settings: GameSettings) => void;
  resetGame: () => void;
}

type ScorekeeperStore = ScorekeeperState & ScorekeeperActions;

const FRESH_STATE: ScorekeeperState = {
  version: 1,
  hands: [],
  runningScores: {},
};

/**
 * Scorekeeper game state.
 * State shape matches @250-500/shared schema; persisted to localStorage with Zod validation
 * on rehydration. Corrupted state resets to defaults.
 */
export const useScorekeeperStore = create<ScorekeeperStore>()(
  persist(
    (set) => ({
      ...FRESH_STATE,
      initGame: (settings) => {
        const runningScores: Record<string, number> = {};
        for (const p of settings.players) runningScores[p.id] = 0;
        set({
          version: 1,
          settings,
          hands: [],
          runningScores,
          currentHand: { handNumber: 1, bidHistory: [], calledCards: [], partners: [] },
        });
      },
      resetGame: () => set({ ...FRESH_STATE, settings: undefined, currentHand: undefined }),
    }),
    {
      name: 'scorekeeper-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        version: state.version,
        settings: state.settings,
        currentHand: state.currentHand,
        hands: state.hands,
        runningScores: state.runningScores,
      }),
      onRehydrateStorage: () => (rehydrated, error) => {
        if (error) {
          console.error('Failed to rehydrate scorekeeper state', error);
          return;
        }
        if (rehydrated) {
          const result = scorekeeperStateSchema.safeParse(rehydrated);
          if (!result.success) {
            console.warn('Stored scorekeeper state invalid; resetting', result.error);
            useScorekeeperStore.persist.clearStorage();
          }
        }
      },
    },
  ),
);

export type { GameSettings, Player, GameType };
