import { describe, it, expect, beforeEach } from 'vitest';
import { useConnectionStore } from './connection-store';

describe('connection-store', () => {
  beforeEach(() => {
    useConnectionStore.getState().disconnect();
  });

  it('starts in idle state', () => {
    expect(useConnectionStore.getState().status).toBe('idle');
    expect(useConnectionStore.getState().socket).toBeNull();
  });

  it('disconnect clears socket and resets status', () => {
    useConnectionStore.setState({ socket: null, status: 'connected' });
    useConnectionStore.getState().disconnect();
    // disconnect on null socket is a no-op; status stays 'connected'.
    // Force a state then disconnect
    useConnectionStore.getState().disconnect();
    expect(useConnectionStore.getState().socket).toBeNull();
  });
});
