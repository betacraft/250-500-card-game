import { expect, test, type Page } from '@playwright/test';
import { saveShot } from './visible-hand';

const views = [
  { width: 320, height: 568, shot: 'finish-clear-320x568.png' },
  { width: 360, height: 740, shot: 'finish-clear-360x740.png' },
  { width: 390, height: 844, shot: null },
  { width: 667, height: 375, shot: 'finish-clear-667x375.png' },
  { width: 1366, height: 768, shot: null },
] as const;

test.describe('finish hand stays clear of the trick', () => {
  test.describe.configure({ timeout: 90_000 });

  for (const view of views) {
    test(`does not cover the trick or the status line at ${view.width}x${view.height}`, async ({ page }) => {
      await page.clock.install();
      await page.setViewportSize({ width: view.width, height: view.height });
      await page.goto('/play?script=lock-made');
      await page.getByRole('button', { name: /^250/ }).click();
      await page.getByLabel('Your name').click();
      await page.keyboard.type('Ada');
      await page.getByTestId('start-vs-bots').click();
      await page.getByTestId('finish-hand').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('finish-hand')).toBeVisible();
      await expect(page.getByTestId('play-status')).toBeVisible();
      await expectClear(page, 'play-status');
      await page.getByTestId('hand-card').click({ force: true });
      await expect(page.getByTestId('confirm-play')).toBeVisible();
      await page.getByTestId('confirm-play').click({ force: true });
      for (let step = 0; step < 80; step += 1) {
        if (await page.getByTestId('trick-status').isVisible().catch(() => false)) break;
        await page.clock.runFor(100);
      }
      await page.getByTestId('finish-hand').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('trick-status')).toBeVisible();
      await expect(page.getByTestId('finish-hand')).toBeVisible();
      await expectClear(page, 'trick-status');
      if (view.shot) await saveShot(page, `/opt/cursor/artifacts/${view.shot}`, false);
    });
  }
});

async function expectClear(page: Page, statusId: 'play-status' | 'trick-status'): Promise<void> {
  const boxes = await page.evaluate((status) => {
    const rect = (id: string) => {
      const node = document.querySelector(`[data-testid="${id}"]`);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    };
    return { finish: rect('finish-hand'), trick: rect('trick-area'), status: rect(status) };
  }, statusId);
  expect(boxes.finish).not.toBeNull();
  expect(boxes.trick).not.toBeNull();
  expect(boxes.status).not.toBeNull();
  if (!boxes.finish || !boxes.trick || !boxes.status) return;
  expect(overlaps(boxes.finish, boxes.trick)).toBe(false);
  expect(overlaps(boxes.finish, boxes.status)).toBe(false);
}

function overlaps(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
