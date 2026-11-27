import { expect, test, type Page } from '@playwright/test';
import { saveShot } from './visible-hand';

const LETTER = /\b[2-9TJQKA10]{1,2}[shdc]\b/;

test.describe('auction text uses suit symbols once', () => {
  for (const item of [
    { game: '250' as const, width: 390, height: 844, shot: 'r29-390x844-info.png' },
    { game: '500' as const, width: 390, height: 844, shot: null },
    { game: '250' as const, width: 1280, height: 800, shot: null },
    { game: '500' as const, width: 1280, height: 800, shot: 'r29-1280x800-500.png' },
  ]) {
    test(`${item.game} info pane at ${item.width}x${item.height}`, async ({ page }) => {
      await open(page, item.game, item.width, item.height, 'reveal');
      await expect(page.getByTestId('table-status')).toBeVisible();
      await expect(page.getByTestId('auction-recap')).toBeVisible();
      await expectDealOnce(page);
      if (item.shot) await saveShot(page, `/opt/cursor/artifacts/${item.shot}`, false);
    });
  }

  test('the 390 recap keeps one trump and called line', async ({ page }) => {
    await open(page, '250', 390, 844, 'over');
    await expect(page.getByTestId('hand-complete')).toBeVisible();
    await expectDealOnce(page);
    await saveShot(page, '/opt/cursor/artifacts/r29-390x844-recap.png', false);
  });
});

async function open(page: Page, game: '250' | '500', width: number, height: number, script: 'reveal' | 'over'): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto(`/play?script=${script}`);
  await page.getByRole('button', { name: new RegExp(`^${game}`) }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByTestId('start-vs-bots').click();
}

async function expectDealOnce(page: Page): Promise<void> {
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(LETTER);
  expect(text.match(/Trump:/g) ?? []).toHaveLength(1);
  expect(text.match(/\bCalled\b/g) ?? []).toHaveLength(1);
}
