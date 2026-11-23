import { expect, test } from '@playwright/test';

async function playOneHand(page: import('@playwright/test').Page, variant: '250' | '500'): Promise<void> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/play');
  await expect(page.getByText(/no coins, no stakes/i)).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByTestId('start-vs-bots').click();
  await expect(page.getByTestId('hand-fan')).toBeVisible();
  await expect(page.getByTestId('hand-card')).toHaveCount(variant === '250' ? 8 : 12);
  const label = test.info().title.replace(/\s+/g, '-').toLowerCase();
  await page.screenshot({ path: `/opt/cursor/artifacts/bidding-hand-${label}.png`, fullPage: true });
  const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(scrolls).toBe(false);
  let paused = false;
  for (let step = 0; step < 500; step += 1) {
    if (!paused && (await page.getByTestId('trick-pause').isVisible().catch(() => false))) {
      await page.screenshot({ path: `/opt/cursor/artifacts/trick-pause-${label}.png`, fullPage: true });
      paused = true;
    }
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) break;
    const pass = page.getByRole('button', { name: 'Pass' });
    if (await pass.isVisible().catch(() => false)) {
      await pass.click();
      continue;
    }
    const card = page.locator('[data-testid="hand-card"]:not([disabled])').first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.getByTestId('confirm-play').click();
      continue;
    }
    await page.waitForTimeout(60);
  }
  await expect(page.getByTestId('hand-complete')).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: `/opt/cursor/artifacts/local-table-${label}.png`, fullPage: true });
  expect(errors, errors.join('\n')).toEqual([]);
}

test.describe('local table', () => {
  test.describe.configure({ timeout: 120_000 });

  test('250 mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await playOneHand(page, '250');
  });

  test('500 mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await playOneHand(page, '500');
  });

  test('250 desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await playOneHand(page, '250');
  });

  test('500 desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await playOneHand(page, '500');
  });
});
