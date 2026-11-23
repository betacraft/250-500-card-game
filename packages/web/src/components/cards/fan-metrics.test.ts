import { describe, expect, it } from 'vitest';
import { fanMetrics } from './fan-metrics';

describe('fanMetrics', () => {
  it('keeps one 84px row on a phone and a tappable sliver on every card', () => {
    for (const container of [336, 360]) {
      for (let count = 1; count <= 12; count += 1) {
        const metrics = fanMetrics(count, container, true, null);
        expect(metrics.cardW, `${container} count ${count}`).toBe(84);
        const bottoms = Array.from({ length: count }, (_, index) => metrics.bottom(index));
        expect(new Set(bottoms).size).toBe(1);
        for (let index = 0; index < count; index += 1) {
          const width = index === count - 1 && count > 1
            ? metrics.cardWidth(index)
            : metrics.left(index + 1) - metrics.left(index);
          if (count > 1) expect(width, `${container} card ${index} of ${count}`).toBeGreaterThanOrEqual(24);
        }
      }
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
