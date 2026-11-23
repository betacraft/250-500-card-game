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

/** One card width for the whole hand, stable enough to compare across phases. */
export async function assertHandSize(page: Page): Promise<number> {
  const raw = await page.getByTestId('hand-fan').getAttribute('data-card-width');
  const width = Number(raw);
  expect(width).toBeGreaterThan(40);
  return width;
}

/** Rank buttons stay above the dock. A fitted grid is fully visible without scrolling it. */
export async function assertGridClear(page: Page, mustFit: boolean): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const grid = document.querySelector('[data-testid="rank-grid"]');
    if (grid) grid.scrollTop = 0;
  });
  const report = await page.evaluate((fitted) => {
    const grid = document.querySelector('[data-testid="rank-grid"]');
    const dock = document.querySelector('[data-testid="hand-dock"]');
    const problems: string[] = [];
    if (!grid || !dock) return { problems: ['missing grid'], fit: false };
    const dockTop = dock.getBoundingClientRect().top;
    const buttons = [...grid.querySelectorAll('button')];
    const form = grid.closest('[data-testid="declare-form"]');
    const scroller = form instanceof HTMLElement ? form : grid instanceof HTMLElement ? grid : null;
    if (!scroller) return { problems: ['missing scroller'], fit: false };
    const fits = scroller.scrollHeight <= scroller.clientHeight + 4;
    if (fitted && !fits) problems.push(`grid scrolls ${scroller.scrollHeight}>${scroller.clientHeight}`);
    buttons.forEach((button, index) => {
      const frame = scroller.getBoundingClientRect();
      const box = button.getBoundingClientRect();
      if (box.top < frame.top - 1) scroller.scrollTop -= frame.top - box.top;
      if (box.bottom > frame.bottom - 2) scroller.scrollTop += box.bottom - frame.bottom + 6;
      const seen = button.getBoundingClientRect();
      if (seen.bottom > dockTop + 0.5) problems.push(`cell ${index} under the dock`);
      const hit = document.elementFromPoint(seen.left + seen.width / 2, seen.top + seen.height / 2);
      if (dock.contains(hit) && hit !== button && !button.contains(hit)) problems.push(`cell ${index} covered`);
    });
    return { problems, fit: fits };
  }, mustFit);
  expect(report.problems, JSON.stringify(report)).toEqual([]);
}

/** Every score chip shows its score, with no ellipsis and no clipped text. */
export async function assertScoreChips(page: Page): Promise<void> {
  const report = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('[data-testid="score-chip"]')];
    const problems: string[] = [];
    chips.forEach((chip, index) => {
      const text = chip.querySelector('[data-testid="score-chip-text"]');
      const score = chip.querySelector('[data-testid="score-chip-score"]');
      if (!(text instanceof HTMLElement) || !(score instanceof HTMLElement)) {
        problems.push(`chip ${index} is missing its text`);
        return;
      }
      const nodes = [text, chip instanceof HTMLElement ? chip : text];
      nodes.forEach((node) => {
        if (node.scrollWidth > node.clientWidth + 0.5) problems.push(`chip ${index} overflows ${node.scrollWidth}>${node.clientWidth}`);
        if (getComputedStyle(node).textOverflow === 'ellipsis') problems.push(`chip ${index} uses ellipsis`);
      });
      const box = score.getBoundingClientRect();
      if (box.width < 1 || box.left < -0.5 || box.right > window.innerWidth + 0.5 || box.top < -0.5 || box.bottom > window.innerHeight + 0.5) {
        problems.push(`chip ${index} score outside viewport`);
      }
    });
    return { count: chips.length, problems };
  });
  expect(report.count).toBeGreaterThan(0);
  expect(report.problems, JSON.stringify(report)).toEqual([]);
}

/** Scroll each control above the pinned fan, then prove the fan does not cover its centre. */
export async function assertControlsClear(page: Page): Promise<void> {
  const controls = page.locator('main button, [data-testid="hand-dock"] button:not([data-testid="hand-card"])');
  const count = await controls.count();
  const handCards = page.locator('[data-testid="hand-card"]');
  expect(count + await handCards.count()).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const control = controls.nth(i);
    await control.evaluate((node) => {
      let parent = node.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          const frame = parent.getBoundingClientRect();
          const box = node.getBoundingClientRect();
          if (box.bottom > frame.bottom - 4) parent.scrollTop += box.bottom - frame.bottom + 8;
          if (box.top < frame.top) parent.scrollTop -= frame.top - box.top + 4;
        }
        parent = parent.parentElement;
      }
      const dock = document.querySelector('[data-testid="hand-dock"]');
      if (!dock) return;
      const limit = dock.getBoundingClientRect().top - 8;
      const box = node.getBoundingClientRect();
      const delta = box.bottom - limit;
      if (delta > 0) window.scrollBy(0, delta + 2);
    });
    const hit = await control.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const x = Math.round(box.left + box.width / 2);
      const y = Math.round(box.top + box.height / 2);
      const target = document.elementFromPoint(x, y);
      const dock = document.querySelector('[data-testid="hand-dock"]');
      const label = node.getAttribute('aria-label') ?? node.textContent ?? '';
      const self = target === node || (!!target && node.contains(target));
      return {
        label: label.trim().slice(0, 40),
        covered: !self && (dock?.contains(target) ?? false),
        self,
      };
    });
    expect(hit.covered, hit.label).toBe(false);
    expect(hit.self, hit.label).toBe(true);
  }
  await page.evaluate(() => {
    const dock = document.querySelector('[data-testid="hand-dock"]');
    if (!dock) return;
    const limit = dock.getBoundingClientRect().top - 8;
    const nodes = [...document.querySelectorAll('main button, main p')];
    const last = nodes[nodes.length - 1];
    if (!last) return;
    const delta = last.getBoundingClientRect().bottom - limit;
    if (delta > 0) window.scrollBy(0, delta + 2);
  });
  const gap = await page.evaluate(() => {
    const dock = document.querySelector('[data-testid="hand-dock"]');
    if (!dock) return 99;
    const top = dock.getBoundingClientRect().top;
    let nearest = Number.POSITIVE_INFINITY;
    for (const node of document.querySelectorAll('main button, main p')) {
      const box = node.getBoundingClientRect();
      if (box.height < 1 || box.bottom > top + 0.5) continue;
      nearest = Math.min(nearest, top - box.bottom);
    }
    return nearest;
  });
  expect(gap).toBeGreaterThanOrEqual(8);
}
