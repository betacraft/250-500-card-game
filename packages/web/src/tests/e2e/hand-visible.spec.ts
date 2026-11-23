import { expect, test } from '@playwright/test';
import { assertControlsClear, assertHandCorners } from './visible-hand';

const views = [
  { width: 1024, height: 572, shot: true },
  { width: 1280, height: 800, shot: false },
  { width: 1366, height: 768, shot: false },
  { width: 390, height: 844, shot: false },
  { width: 360, height: 740, shot: true },
] as const;

async function deal(page: import('@playwright/test').Page, variant: '250' | '500', width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/play');
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByTestId('start-vs-bots').click();
  await expect(page.getByTestId('hand-fan')).toBeVisible();
}

async function bidMax(page: import('@playwright/test').Page): Promise<void> {
  for (let i = 0; i < 16; i += 1) {
    const add = page.getByRole('button', { name: 'Add 20 to the bid' });
    if (!(await add.isVisible().catch(() => false)) || (await add.isDisabled())) break;
    await add.click();
  }
  await page.getByRole('button', { name: /^Bid / }).click();
}

test.describe('hand stays readable', () => {
  test.describe.configure({ timeout: 90_000 });

  for (const variant of ['250', '500'] as const) {
    for (const view of views) {
      test(`${variant} at ${view.width}x${view.height}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));
        await deal(page, variant, view.width, view.height);
        await assertHandCorners(page);
        await assertControlsClear(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        if (view.shot) await page.screenshot({ path: `/opt/cursor/artifacts/bid-${variant}-${view.width}x${view.height}.png`, fullPage: false });
        await bidMax(page);
        await expect(page.getByTestId('declare-form')).toBeVisible();
        await assertHandCorners(page);
        await assertControlsClear(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
        expect(overflow).toBe(false);
        if (view.shot) await page.screenshot({ path: `/opt/cursor/artifacts/declare-${variant}-${view.width}x${view.height}.png`, fullPage: false });
        await page.getByRole('button', { name: 'Trump Spades' }).click();
        const need = variant === '250' ? 2 : 3;
        for (const rank of ['3', '4', '5'].slice(0, need)) {
          await page.getByTestId('declare-form').getByRole('button', { name: new RegExp(`^${rank} of clubs`) }).click();
        }
        await page.getByRole('button', { name: 'Confirm declaration' }).click();
        await expect(page.getByText('Your turn')).toBeVisible();
        await assertHandCorners(page);
        await assertControlsClear(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        if (view.shot) await page.screenshot({ path: `/opt/cursor/artifacts/play-${variant}-${view.width}x${view.height}.png`, fullPage: false });
        expect(errors, errors.join('\n')).toEqual([]);
      });
    }
  }
});
