import { describe, expect, it } from 'vitest';
import { fanMetrics } from './fan-metrics';

describe('fanMetrics', () => {
  it('keeps a stable 84px card on a short phone, with centres clear at 12 cards', () => {
    for (let count = 1; count <= 12; count += 1) {
      const metrics = fanMetrics(count, 336, true, null);
      expect(metrics.cardW, `count ${count}`).toBe(84);
      expect(centreGap(metrics, count, 336)).toBeGreaterThanOrEqual(metrics.cardW * 0.5 - 0.2);
    }
  });

  it('caps a desktop fan at 30% of an 800px window', () => {
    for (const count of [8, 12]) {
      const metrics = fanMetrics(count, 956, false, 240);
      expect(metrics.height).toBeLessThanOrEqual(240.5);
      expect(centreGap(metrics, count, 956)).toBeGreaterThanOrEqual(metrics.cardW * 0.5 - 0.2);
    }
  });

  it('uses one card width for every index', () => {
    const metrics = fanMetrics(12, 336, true, null);
    const lefts = Array.from({ length: 12 }, (_, index) => metrics.left(index));
    expect(new Set(lefts).size).toBeGreaterThan(1);
    expect(metrics.bottom(0)).toBeGreaterThan(metrics.bottom(11));
  });
});

function centreGap(metrics: { cardW: number; left: (index: number) => number }, count: number, _container: number): number {
  if (count <= 1) return metrics.cardW;
  let gap = Number.POSITIVE_INFINITY;
  for (let index = 1; index < count; index += 1) {
    const delta = metrics.left(index) - metrics.left(index - 1);
    if (delta > 0.5) gap = Math.min(gap, delta);
  }
  return gap;
}
