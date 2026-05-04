import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './settings-store';

describe('settings-store', () => {
  beforeEach(() => {
    useSettingsStore.setState({ alwaysConfirmCardPlay: true, reducedMotion: 'auto' });
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
});
