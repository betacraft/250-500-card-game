import { expect, test } from '@playwright/test';
import { saveShot } from './visible-hand';

test.describe('320 layout', () => {
  test.describe.configure({ timeout: 60_000 });

  test('the +20 bid pill keeps its border on screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/play');
    await page.getByRole('button', { name: /^250/ }).click();
    await page.getByLabel('Your name').fill('Ada');
    await page.getByTestId('start-vs-bots').click();
    const add = page.getByRole('button', { name: 'Add 20 to the bid' });
    await expect(add).toBeVisible({ timeout: 20_000 });
    const fit = await add.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const edge: Array<[number, number]> = [
        [box.left + box.width / 2, box.top + 1],
        [box.right - 1, box.top + box.height / 2],
        [box.left + box.width / 2, box.bottom - 1],
        [box.left + 1, box.top + box.height / 2],
      ];
      const hits = edge.map(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return hit === node || (hit !== null && node.contains(hit));
      });
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, hits };
    });
    expect(fit.left).toBeGreaterThanOrEqual(0);
    expect(fit.right).toBeLessThanOrEqual(320);
    expect(fit.top).toBeGreaterThanOrEqual(0);
    expect(fit.bottom).toBeLessThanOrEqual(568);
    expect(fit.hits).toEqual([true, true, true, true]);
    await saveShot(page, '/opt/cursor/artifacts/bid-pill-320x568.png', false);
  });
});
