import { afterEach, describe, expect, it, vi } from 'vitest';
import { playRevealChime } from './reveal-chime';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reveal chime', () => {
  it('stays silent when sound is muted', () => {
    const Ctx = vi.fn();
    vi.stubGlobal('AudioContext', Ctx);
    playRevealChime(true);
    expect(Ctx).not.toHaveBeenCalled();
  });

  it('starts a short tone when sound is on', () => {
    let started = false;
    class Fake {
      currentTime = 0;
      destination = {};
      createOscillator(): {
        frequency: { value: number };
        connect: () => void;
        start: () => void;
        stop: () => void;
        onended: (() => void) | null;
      } {
        return {
          frequency: { value: 0 },
          connect() {},
          start() {
            started = true;
          },
          stop() {},
          onended: null,
        };
      }
      createGain(): {
        gain: { setValueAtTime: () => void; exponentialRampToValueAtTime: () => void };
        connect: () => void;
      } {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
        };
      }
      close(): void {}
    }
    vi.stubGlobal('AudioContext', Fake);
    playRevealChime(false);
    expect(started).toBe(true);
  });
});
