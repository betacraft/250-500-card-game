import { describe, expect, it } from 'vitest';
import { fanMetrics } from './fan-metrics';

describe('fanMetrics', () => {
  it('keeps every card the same width and inside the row, with a 24px sliver', () => {
    for (const container of [336, 366]) {
      for (let count = 1; count <= 12; count += 1) {
        const metrics = fanMetrics(count, container, true, null);
        const widths = Array.from({ length: count }, (_, index) => metrics.cardWidth(index));
        expect(new Set(widths).size, `${container} count ${count}`).toBe(1);
        const bottoms = Array.from({ length: count }, (_, index) => metrics.bottom(index));
        expect(new Set(bottoms).size).toBe(1);
        if (count <= 1) continue;
        const sliver = metrics.left(1) - metrics.left(0);
        expect(sliver, `${container} count ${count}`).toBeGreaterThanOrEqual(24);
        const lastRight = metrics.left(count - 1) + metrics.cardWidth(count - 1);
        expect(lastRight, `${container} count ${count} overflows`).toBeLessThanOrEqual(container);
        expect(metrics.left(0)).toBeGreaterThanOrEqual(0);
      }
    }
    expect(fanMetrics(8, 336, true, null).cardW).toBe(84);
    const phone12 = fanMetrics(12, 336, true, null);
    expect(phone12.cardW).toBeLessThanOrEqual(72);
    expect(phone12.cardW).toBe(phone12.cardWidth(11));
    expect(fanMetrics(12, 366, true, null).cardW).toBe(84);
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
