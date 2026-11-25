import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { noteSettingsChanged } from '../analytics/table-events';

interface SettingsState {
  alwaysConfirmCardPlay: boolean;
  reducedMotion: 'auto' | 'always' | 'never';
  /** True while the reveal chime and any later cues stay silent. */
  soundMuted: boolean;
  setAlwaysConfirmCardPlay: (value: boolean) => void;
  setReducedMotion: (value: 'auto' | 'always' | 'never') => void;
  setSoundMuted: (value: boolean) => void;
}

/** App-wide user preferences. Persisted to localStorage. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      alwaysConfirmCardPlay: true,
      reducedMotion: 'auto',
      soundMuted: false,
      setAlwaysConfirmCardPlay: (value) => {
        set({ alwaysConfirmCardPlay: value });
        noteSettingsChanged('alwaysConfirmCardPlay', String(value));
      },
      setReducedMotion: (value) => {
        set({ reducedMotion: value });
        noteSettingsChanged('reducedMotion', value);
      },
      setSoundMuted: (value) => {
        set({ soundMuted: value });
        noteSettingsChanged('soundMuted', String(value));
      },
    }),
    { name: 'settings-v1' },
  ),
);
