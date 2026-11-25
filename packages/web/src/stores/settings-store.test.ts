import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './settings-store';

describe('settings-store', () => {
  beforeEach(() => {
    useSettingsStore.setState({ alwaysConfirmCardPlay: true, reducedMotion: 'auto', soundMuted: false });
  });

  it('starts with alwaysConfirmCardPlay = true', () => {
    expect(useSettingsStore.getState().alwaysConfirmCardPlay).toBe(true);
  });

  it('setAlwaysConfirmCardPlay updates the value', () => {
    useSettingsStore.getState().setAlwaysConfirmCardPlay(false);
    expect(useSettingsStore.getState().alwaysConfirmCardPlay).toBe(false);
  });

  it('setReducedMotion updates the value', () => {
    useSettingsStore.getState().setReducedMotion('always');
    expect(useSettingsStore.getState().reducedMotion).toBe('always');
  });

  it('setSoundMuted silences the reveal chime', () => {
    expect(useSettingsStore.getState().soundMuted).toBe(false);
    useSettingsStore.getState().setSoundMuted(true);
    expect(useSettingsStore.getState().soundMuted).toBe(true);
  });
});
