import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { noteSettingsChanged } from '../analytics/table-events';

interface SettingsState {
  alwaysConfirmCardPlay: boolean;
  reducedMotion: 'auto' | 'always' | 'never';
  setAlwaysConfirmCardPlay: (value: boolean) => void;
  setReducedMotion: (value: 'auto' | 'always' | 'never') => void;
}

/** App-wide user preferences. Persisted to localStorage. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      alwaysConfirmCardPlay: true,
      reducedMotion: 'auto',
      setAlwaysConfirmCardPlay: (value) => {
        set({ alwaysConfirmCardPlay: value });
        noteSettingsChanged('alwaysConfirmCardPlay', String(value));
      },
      setReducedMotion: (value) => {
        set({ reducedMotion: value });
        noteSettingsChanged('reducedMotion', value);
      },
    }),
    { name: 'settings-v1' },
  ),
);
