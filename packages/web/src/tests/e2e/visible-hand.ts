import { expect, type Page } from '@playwright/test';

/** Rank corner of every hand card must be on screen and inside every clipping ancestor. */
export async function assertHandCorners(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  const report = await page.evaluate(() => {
    const indexes = [...document.querySelectorAll('[data-testid="hand-fan"] [data-testid="card-index"]')];
    const problems: string[] = [];
    const clips = (node: Element): DOMRect[] => {
      const boxes: DOMRect[] = [];
      let parent = node.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        const clipsX = style.overflowX === 'hidden' || style.overflowX === 'clip' || style.overflowX === 'auto' || style.overflowX === 'scroll';
        const clipsY = style.overflowY === 'hidden' || style.overflowY === 'clip' || style.overflowY === 'auto' || style.overflowY === 'scroll';
        if (clipsX || clipsY) boxes.push(parent.getBoundingClientRect());
        parent = parent.parentElement;
      }
      return boxes;
    };
    indexes.forEach((index, i) => {
      const box = index.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) {
        problems.push(`card ${i} has no corner box`);
        return;
      }
      if (box.top < -0.5 || box.left < -0.5 || box.bottom > window.innerHeight + 0.5 || box.right > window.innerWidth + 0.5) {
        problems.push(`card ${i} corner outside viewport ${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.right)},${Math.round(box.bottom)}`);
      }
      clips(index).forEach((clip, clipIndex) => {
        if (box.top < clip.top - 0.5 || box.bottom > clip.bottom + 0.5 || box.left < clip.left - 0.5 || box.right > clip.right + 0.5) {
          problems.push(`card ${i} corner clipped by ancestor ${clipIndex}`);
        }
      });
    });
    const fan = document.querySelector('[data-testid="hand-fan"]')?.getBoundingClientRect();
    return { problems, count: indexes.length, fanTop: fan?.top ?? -1, fanBottom: fan?.bottom ?? -1, height: window.innerHeight };
  });
  expect(report.count).toBeGreaterThan(0);
  expect(report.problems, JSON.stringify(report)).toEqual([]);
  expect(report.fanTop).toBeGreaterThanOrEqual(-0.5);
  expect(report.fanBottom).toBeLessThanOrEqual(report.height + 0.5);
}
