import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { noteDifficulty, noteSettingsChanged } from '../analytics/table-events';

export type BotDifficulty = 'easy' | 'normal';

interface SettingsState {
  alwaysConfirmCardPlay: boolean;
  reducedMotion: 'auto' | 'always' | 'never';
  /** Local table bots. Easy is the default. Kept in localStorage. */
  botDifficulty: BotDifficulty;
  /** True while the reveal chime and any later cues stay silent. */
  soundMuted: boolean;
  setAlwaysConfirmCardPlay: (value: boolean) => void;
  setReducedMotion: (value: 'auto' | 'always' | 'never') => void;
  setBotDifficulty: (value: BotDifficulty) => void;
  setSoundMuted: (value: boolean) => void;
}

/** App-wide user preferences. Persisted to localStorage. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      alwaysConfirmCardPlay: true,
      reducedMotion: 'auto',
      botDifficulty: 'easy',
      soundMuted: false,
      setAlwaysConfirmCardPlay: (value) => {
        set({ alwaysConfirmCardPlay: value });
        noteSettingsChanged('alwaysConfirmCardPlay', String(value));
      },
      setReducedMotion: (value) => {
        set({ reducedMotion: value });
        noteSettingsChanged('reducedMotion', value);
      },
      setBotDifficulty: (value) => {
        set({ botDifficulty: value });
        noteSettingsChanged('botDifficulty', value);
        noteDifficulty(value);
      },
      setSoundMuted: (value) => {
        set({ soundMuted: value });
        noteSettingsChanged('soundMuted', String(value));
      },
    }),
    { name: 'settings-v1' },
  ),
);
