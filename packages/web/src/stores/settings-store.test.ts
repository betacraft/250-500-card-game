import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './settings-store';

describe('settings-store', () => {
  beforeEach(() => {
    useSettingsStore.setState({ alwaysConfirmCardPlay: true, reducedMotion: 'auto', botDifficulty: 'easy' });
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

  it('keeps Easy as the bot default and stores a later choice', () => {
    expect(useSettingsStore.getState().botDifficulty).toBe('easy');
    useSettingsStore.getState().setBotDifficulty('normal');
    expect(useSettingsStore.getState().botDifficulty).toBe('normal');
  });
});
