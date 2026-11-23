import { describe, expect, it } from 'vitest';
import { fanMetrics } from './fan-metrics';

describe('fanMetrics', () => {
  it('keeps one 84px row on a phone for every hand size', () => {
    for (let count = 1; count <= 12; count += 1) {
      const metrics = fanMetrics(count, 336, true, null);
      expect(metrics.cardW, `count ${count}`).toBe(84);
      expect(metrics.height).toBeLessThanOrEqual(336 * 0.32 + 80);
      const bottoms = Array.from({ length: count }, (_, index) => metrics.bottom(index));
      expect(new Set(bottoms).size).toBe(1);
    }
  });

  it('caps a desktop fan at the given height and stays one row', () => {
    for (const count of [8, 12]) {
      const metrics = fanMetrics(count, 956, false, 240);
      expect(metrics.height).toBeLessThanOrEqual(240.5);
      const bottoms = Array.from({ length: count }, (_, index) => metrics.bottom(index));
      expect(new Set(bottoms).size).toBe(1);
    }
  });
});
