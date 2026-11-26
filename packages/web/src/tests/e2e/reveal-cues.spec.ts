import { expect, test, type Locator, type Page } from '@playwright/test';
import { saveShot } from './visible-hand';

test.describe('partner reveal cues on a short table', () => {
  test.describe.configure({ timeout: 60_000 });

  for (const item of [
    { variant: '250' as const, width: 667, height: 375, bid: '♥ 160' },
    { variant: '500' as const, width: 667, height: 375, bid: '♥ 300' },
    { variant: '250' as const, width: 800, height: 480, bid: '♥ 160' },
    { variant: '500' as const, width: 800, height: 480, bid: '♥ 300' },
  ]) {
    test(`${item.variant} toast and badges at ${item.width}x${item.height}`, async ({ page }) => {
      await page.setViewportSize({ width: item.width, height: item.height });
      await openScript(page, 'declared', item.variant);
      await expect(page.getByTestId('partner-badge')).toHaveCount(0);
      await expect(page.getByTestId('bidder-bid')).toHaveText(item.bid);
      if (item.variant === '500' && item.width === 667) {
        await expect(page.getByTestId('private-star')).toBeVisible();
        await saveShot(page, '/opt/cursor/artifacts/private-star-667x375-500.png', false);
      }
      await openScript(page, 'reveal', item.variant);
      const toast = page.getByTestId('partner-toast');
      await expect(toast).toContainText(/partner!/);
      await page.waitForTimeout(250);
      const pill = page.getByTestId('partner-toast-pill');
      const opacity = await pill.evaluate((node) => Number(getComputedStyle(node).opacity));
      expect(opacity).toBeGreaterThan(0.9);
      await expectCentredOnTrick(page);
      await assertHit(page.locator('[data-testid="trick-card"]').first());
      await assertHit(page.locator('[data-testid="hand-card"]').first());
      if (item.width === 667) {
        await saveShot(page, `/opt/cursor/artifacts/reveal-toast-667x375-${item.variant}.png`, false);
        await saveShot(page, `/opt/cursor/artifacts/reveal-toast-peak-667x375-${item.variant}.png`, false);
      }
      await expect(toast).not.toContainText('partner', { timeout: 4_000 });
      await expect(page.getByTestId('partner-badge').first()).toBeVisible();
      await expect(page.getByTestId('private-star')).toHaveCount(0);
      await expect(page.getByTestId('bidder-bid')).toHaveText(item.bid);
      if (item.variant === '500' && item.width === 667) {
        await saveShot(page, '/opt/cursor/artifacts/badges-667x375-500.png', false);
        await saveShot(page, '/opt/cursor/artifacts/public-star-667x375-500.png', false);
        await expect(page.getByTestId('private-partner')).toContainText("You're Bot 2's partner");
        await saveShot(page, '/opt/cursor/artifacts/status-after-reveal-667x375-500.png', false);
      }
    });
  }
});

async function openScript(page: Page, script: 'declared' | 'reveal', variant: '250' | '500'): Promise<void> {
  await page.goto(`/play?script=${script}`);
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').click();
  await page.keyboard.type('Ada');
  await page.getByTestId('start-vs-bots').click();
}

async function expectCentredOnTrick(page: Page): Promise<void> {
  const felt = await page.locator('[data-testid="trick-live"] .bg-felt, [data-testid="trick-live"]').first().boundingBox();
  const pill = await page.getByTestId('partner-toast-pill').boundingBox();
  if (!felt || !pill) throw new Error('missing trick or toast');
  const pillMid = pill.x + pill.width / 2;
  const feltMid = felt.x + felt.width / 2;
  expect(Math.abs(pillMid - feltMid)).toBeLessThan(felt.width * 0.2);
  expect(pill.y).toBeGreaterThanOrEqual(felt.y - 1);
  expect(pill.y).toBeLessThan(felt.y + 28);
}

async function assertHit(locator: Locator): Promise<void> {
  const problems = await locator.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + Math.min(box.height / 2, 24);
    const hit = document.elementFromPoint(x, y);
    if (box.width < 8 || box.height < 8) return ['too small'];
    if (hit === node || (hit && node.contains(hit))) return [];
    return [`hit ${hit?.getAttribute?.('data-testid') || hit?.tagName || 'none'}`];
  });
  expect(problems, problems.join('; ')).toEqual([]);
}
