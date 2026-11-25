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
  /** Normal is 1x. Fast is the 2x table speed. */
  playSpeed: 'normal' | 'fast';
  /** Lift and play the only legal follow. Default on. */
  autoPlayForced: boolean;
  setAlwaysConfirmCardPlay: (value: boolean) => void;
  setReducedMotion: (value: 'auto' | 'always' | 'never') => void;
  setBotDifficulty: (value: BotDifficulty) => void;
  setSoundMuted: (value: boolean) => void;
  setPlaySpeed: (value: 'normal' | 'fast') => void;
  setAutoPlayForced: (value: boolean) => void;
}

/** App-wide user preferences. Persisted to localStorage. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      alwaysConfirmCardPlay: true,
      reducedMotion: 'auto',
      botDifficulty: 'easy',
      soundMuted: false,
      playSpeed: 'normal',
      autoPlayForced: true,
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
      setPlaySpeed: (value) => {
        set({ playSpeed: value });
        noteSettingsChanged('playSpeed', value);
      },
      setAutoPlayForced: (value) => {
        set({ autoPlayForced: value });
        noteSettingsChanged('autoPlayForced', String(value));
      },
    }),
    { name: 'settings-v1' },
  ),
);
