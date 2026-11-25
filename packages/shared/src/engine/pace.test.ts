import { describe, expect, it } from 'vitest';
import { botPlayDelay, lastTrickHoldMs, remainingDelay, trickPause } from './pace';

describe('play pace', () => {
  it('uses 250/700 at normal speed, 125/350 at 2x, and 150/250 after the lock', () => {
    expect(botPlayDelay('normal', false)).toBe(250);
    expect(botPlayDelay('fast', false)).toBe(125);
    expect(trickPause('normal', false)).toBe(700);
    expect(trickPause('fast', false)).toBe(350);
    expect(botPlayDelay('fast', true)).toBe(150);
    expect(trickPause('normal', true)).toBe(250);
    expect(lastTrickHoldMs('normal')).toBe(700);
    expect(lastTrickHoldMs('fast')).toBe(350);
  });

  it('subtracts compute time and never stacks it', () => {
    expect(remainingDelay(250, 50)).toBe(200);
    expect(remainingDelay(250, 500)).toBe(0);
    expect(remainingDelay(125, 0)).toBe(125);
  });

  it('waits within 50ms of the 125ms 2x target', async () => {
    const started = performance.now();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, remainingDelay(125, 0));
    });
    const elapsed = performance.now() - started;
    console.info(`pace 2x measured ${elapsed.toFixed(1)}ms`);
    expect(Math.abs(elapsed - 125)).toBeLessThanOrEqual(50);
  });
});