import { expect, test, type Locator } from '@playwright/test';
import { saveShot } from './visible-hand';

test.describe('short table keeps the trick and the next hand on screen', () => {
  test.describe.configure({ timeout: 60_000 });

  for (const item of [
    { variant: '250' as const, width: 667, height: 375, shot: 'nexthand-667x375-250' },
    { variant: '500' as const, width: 667, height: 375, shot: 'nexthand-667x375-500' },
  ]) {
    test(`${item.variant} Next hand is on screen at ${item.width}x${item.height}`, async ({ page }) => {
      await page.setViewportSize({ width: item.width, height: item.height });
      await page.goto('/play?script=over');
      await page.getByRole('button', { name: new RegExp(`^${item.variant}`) }).click();
      await page.getByLabel('Your name').click();
      await page.keyboard.type('Ada');
      await page.getByTestId('start-vs-bots').click();
      const next = page.getByTestId('next-hand');
      await expect(next).toBeVisible();
      await expect(page.getByTestId('game-over')).toHaveCount(0);
      await saveShot(page, `/opt/cursor/artifacts/${item.shot}.png`, false);
      await assertPainted(next);
      const dock = await page.getByTestId('hand-dock').boundingBox();
      const box = await next.boundingBox();
      if (!dock || !box) throw new Error('missing next hand');
      expect(box.y).toBeGreaterThanOrEqual(dock.y - 1);
      await next.click();
      await expect(page.getByTestId('hand-fan')).toBeVisible();
    });
  }

  for (const item of [
    { variant: '250' as const, width: 667, height: 375, shot: 'play-667x375-250' },
    { variant: '500' as const, width: 667, height: 375, shot: 'play-667x375-500' },
    { variant: '500' as const, width: 800, height: 480, shot: 'play-800x480-500' },
  ]) {
    test(`${item.variant} trick sits above the fan at ${item.width}x${item.height}`, async ({ page }) => {
      await page.setViewportSize({ width: item.width, height: item.height });
      await page.goto('/play?script=trick');
      await page.getByRole('button', { name: new RegExp(`^${item.variant}`) }).click();
      await page.getByLabel('Your name').click();
      await page.keyboard.type('Ada');
      await page.getByTestId('start-vs-bots').click();
      const trick = page.locator('[data-testid="trick-card"], [data-testid="trick-winner"]');
      await expect(trick.first()).toBeVisible();
      await saveShot(page, `/opt/cursor/artifacts/${item.shot}.png`, false);
      const count = await trick.count();
      expect(count).toBeGreaterThan(0);
      const dockTop = await page.getByTestId('hand-dock').evaluate((node) => node.getBoundingClientRect().top);
      for (let index = 0; index < count; index += 1) {
        await assertPainted(trick.nth(index));
        const box = await trick.nth(index).boundingBox();
        if (!box) throw new Error('missing trick card');
        expect(box.y + box.height).toBeLessThanOrEqual(dockTop + 1);
      }
      const legal = page.locator('[data-testid="hand-card"][aria-disabled="false"]').first();
      const point = await legal.evaluate((node) => {
        const box = node.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + Math.min(box.height / 2, 24) };
      });
      await page.mouse.click(point.x, point.y);
      await expect(legal).toHaveAttribute('data-selected', 'true');
    });
  }
});

async function assertPainted(locator: Locator): Promise<void> {
  const problems = await locator.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    const found: string[] = [];
    if (box.width < 8 || box.height < 8) found.push('too small');
    if (box.top < -0.5 || box.bottom > window.innerHeight + 0.5) found.push('outside');
    if (hit !== node && !(node instanceof Element && node.contains(hit))) found.push('covered');
    return found;
  });
  expect(problems, problems.join('; ')).toEqual([]);
}
