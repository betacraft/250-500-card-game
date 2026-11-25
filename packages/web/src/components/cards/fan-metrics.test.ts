import { describe, expect, it } from 'vitest';
import { cornerClearance, fanMetrics, fanSidePad } from './fan-metrics';

describe('fanMetrics', () => {
  it('keeps the rank corner and the outer edges at least 12px inside the screen', () => {
    for (const screen of [360, 390, 667, 1024, 1366]) {
      for (let count = 1; count <= 12; count += 1) {
        const metrics = fanMetrics(count, screen, screen < 720, null);
        expect(metrics.cardW, `${screen} x${count}`).toBeGreaterThanOrEqual(44);
        const clearance = cornerClearance(count, screen, screen < 720);
        expect(clearance.left, `${screen} x${count} left`).toBeGreaterThanOrEqual(12 - 0.05);
        expect(clearance.right, `${screen} x${count} right`).toBeGreaterThanOrEqual(12 - 0.05);
        const indexInset = clearance.left + 3;
        expect(indexInset, `${screen} x${count} index`).toBeGreaterThanOrEqual(12);
      }
    }
  });

  it('matches the 390px 12-card portrait reference', () => {
    const metrics = fanMetrics(12, 390, true, null);
    expect(metrics.angle(0)).toBeCloseTo(-8, 5);
    expect(metrics.angle(11)).toBeCloseTo(8, 5);
    expect(fanSidePad(metrics.cardW, 8)).toBeCloseTo(32.5, 0);
    const strip = metrics.left(1) - metrics.left(0);
    expect(strip).toBeCloseTo(19.7, 0);
    expect(cornerClearance(12, 390, true).left + 3).toBeGreaterThan(14);
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