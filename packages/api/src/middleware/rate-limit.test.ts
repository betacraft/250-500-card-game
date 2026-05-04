import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, clearRateLimit } from './rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    clearRateLimit('test-socket');
  });

  it('allows up to 10 events per second', () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit('test-socket')).toBe(true);
    }
    expect(checkRateLimit('test-socket')).toBe(false);
  });

  it('clears bucket on disconnect', () => {
    for (let i = 0; i < 10; i++) checkRateLimit('test-socket');
    clearRateLimit('test-socket');
    expect(checkRateLimit('test-socket')).toBe(true);
  });
});
