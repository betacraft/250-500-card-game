import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BotDifficulty = 'easy' | 'normal';

interface SettingsState {
  alwaysConfirmCardPlay: boolean;
  reducedMotion: 'auto' | 'always' | 'never';
  /** Local table bots. Easy is the default. Kept in localStorage. */
  botDifficulty: BotDifficulty;
  setAlwaysConfirmCardPlay: (value: boolean) => void;
  setReducedMotion: (value: 'auto' | 'always' | 'never') => void;
  setBotDifficulty: (value: BotDifficulty) => void;
}

/** App-wide user preferences. Persisted to localStorage. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      alwaysConfirmCardPlay: true,
      reducedMotion: 'auto',
      botDifficulty: 'easy',
      setAlwaysConfirmCardPlay: (value) => set({ alwaysConfirmCardPlay: value }),
      setReducedMotion: (value) => set({ reducedMotion: value }),
      setBotDifficulty: (value) => set({ botDifficulty: value }),
    }),
    { name: 'settings-v1' },
  ),
);
