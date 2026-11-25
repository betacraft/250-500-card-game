import { describe, expect, it } from 'vitest';
import { botPlayDelay, remainingDelay, trickPause } from './pace';

describe('play pace', () => {
  it('uses 400/700 at normal speed, 200/350 at 2x, and 150/250 after the lock', () => {
    expect(botPlayDelay('normal', false)).toBe(400);
    expect(botPlayDelay('fast', false)).toBe(200);
    expect(trickPause('normal', false)).toBe(700);
    expect(trickPause('fast', false)).toBe(350);
    expect(botPlayDelay('fast', true)).toBe(150);
    expect(trickPause('normal', true)).toBe(250);
  });

  it('subtracts compute time and never stacks it', () => {
    expect(remainingDelay(400, 50)).toBe(350);
    expect(remainingDelay(400, 500)).toBe(0);
    expect(remainingDelay(200, 0)).toBe(200);
  });

  it('waits within 50ms of the 200ms 2x target', async () => {
    const started = performance.now();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, remainingDelay(200, 0));
    });
    const elapsed = performance.now() - started;
    console.info(`pace 2x measured ${elapsed.toFixed(1)}ms`);
    expect(Math.abs(elapsed - 200)).toBeLessThanOrEqual(50);
  });
});