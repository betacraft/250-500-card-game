import { expect, test, type Locator, type Page } from '@playwright/test';
import { assertBidAtRest } from './visible-hand';

const views = [
  { width: 1024, height: 572 },
  { width: 800, height: 480 },
  { width: 1280, height: 600 },
  { width: 667, height: 375 },
  { width: 360, height: 640 },
] as const;

test.describe('bid controls stay above the hand', () => {
  test.describe.configure({ timeout: 180_000 });

  for (const variant of ['250', '500'] as const) {
    for (const view of views) {
      test(`${variant} at ${view.width}x${view.height} keeps Bid and Pass clear after a long auction`, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));

        let longest = 0;
        let sawFive = false;
        for (let deal = 0; deal < 40 && longest < 8; deal += 1) {
          if (deal > 0) await abandon(page);
          await startTable(page, variant, view);
          for (let turn = 0; turn < 14 && longest < 8; turn += 1) {
            const bid = page.getByRole('button', { name: /^Bid / });
            const declare = page.getByTestId('declare-form');
            await expect(bid.or(declare)).toBeVisible({ timeout: 20_000 });
            if (await declare.isVisible().catch(() => false)) break;
            const count = await bidCount(page);
            longest = Math.max(longest, count);
            if (count >= 5) {
              sawFive = true;
              await assertBidAtRest(page);
              if (view.width === 1024 && view.height === 572) {
                await page.screenshot({
                  path: `/opt/cursor/artifacts/bidding-long-1024x572-${variant}.png`,
                  fullPage: false,
                });
              }
            } else {
              await assertBidAtRest(page);
            }
            if (count >= 8) break;
            await clickCentre(page, bid);
          }
        }
        expect(sawFive, `longest auction on screen was ${longest}`).toBe(true);
        expect(longest, `longest auction on screen was ${longest}`).toBeGreaterThanOrEqual(8);
        expect(errors, errors.join('\n')).toEqual([]);
      });
    }
  }

  test('500 game over at 1024 does not cover the result', async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1024, height: 572 });
    await page.goto('/play?target=1');
    await page.getByRole('button', { name: /^500/ }).click();
    await page.getByLabel('Your name').click();
    await page.keyboard.type('Ada');
    await page.getByTestId('start-vs-bots').click();
    await page.getByTestId('hand-fan').waitFor();
    for (let hand = 0; hand < 12; hand += 1) {
      await passAuction(page);
      await finishHand(page);
      if (await page.getByTestId('game-over').isVisible().catch(() => false)) break;
      await page.getByRole('button', { name: 'Next hand' }).click();
    }
    await expect(page.getByTestId('game-over')).toBeVisible();
    const again = page.getByTestId('play-again');
    const card = page.getByTestId('hand-complete');
    await expect(again).toBeVisible();
    await page.screenshot({ path: '/opt/cursor/artifacts/game-over-1024-500.png', fullPage: false });
    const againBox = await again.boundingBox();
    const cardBox = await card.boundingBox();
    if (!againBox || !cardBox) throw new Error('missing game-over boxes');
    expect(overlaps(againBox, cardBox)).toBe(false);
    const hit = await again.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const target = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return target === node || node.contains(target);
    });
    expect(hit).toBe(true);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

async function startTable(page: Page, variant: '250' | '500', view: { width: number; height: number }): Promise<void> {
  await page.setViewportSize({ width: view.width, height: view.height });
  if (!page.url().includes('/play')) await page.goto('/play');
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').click();
  await page.keyboard.type('Ada');
  await page.getByTestId('start-vs-bots').click();
  await page.getByTestId('hand-fan').waitFor();
}

async function abandon(page: Page): Promise<void> {
  await page.getByTestId('new-game').click();
  await page.getByTestId('abandon-yes').click();
  await page.getByRole('heading', { name: /play vs bots/i }).waitFor();
}

async function bidCount(page: Page): Promise<number> {
  const history = page.getByTestId('bid-history');
  if (!(await history.count())) return 0;
  return Number(await history.getAttribute('data-count'));
}

async function clickCentre(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('missing click target');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function passAuction(page: Page): Promise<void> {
  for (let guard = 0; guard < 16; guard += 1) {
    const pass = page.getByRole('button', { name: 'Pass', exact: true });
    await expect(pass.or(page.getByTestId('declare-form')).or(page.getByText('Your turn'))).toBeVisible({ timeout: 20_000 });
    if (!(await pass.isVisible().catch(() => false))) return;
    await clickCentre(page, pass);
  }
}

async function finishHand(page: Page): Promise<void> {
  for (let guard = 0; guard < 500; guard += 1) {
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) return;
    if (await page.getByTestId('declare-form').isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Trump: Hearts' }).click();
      const grid = page.getByTestId('rank-grid');
      await grid.getByRole('button', { name: /3 of clubs/ }).click();
      await grid.getByRole('button', { name: /4 of clubs/ }).click();
      await grid.getByRole('button', { name: /5 of clubs/ }).click();
      await page.getByRole('button', { name: 'Confirm declaration' }).click();
      continue;
    }
    if (await page.getByTestId('trick-pause').isVisible().catch(() => false)) {
      await page.getByTestId('trick-pause').click();
      continue;
    }
    if (await page.getByText('Your turn').isVisible().catch(() => false)) {
      const legal = page.locator('[data-testid="hand-card"][aria-disabled="false"]');
      const point = await legal.evaluateAll((cards) => {
        for (const card of cards) {
          const box = card.getBoundingClientRect();
          for (let y = box.top + 8; y < box.bottom - 8; y += 10) {
            for (let x = box.left + 6; x < box.right - 6; x += 8) {
              const hit = document.elementFromPoint(x, y);
              if (hit === card || card.contains(hit)) return { x, y };
            }
          }
        }
        return null;
      });
      if (!point) throw new Error('no open point on a legal card');
      await page.mouse.click(point.x, point.y);
      await page.getByTestId('confirm-play').click();
      continue;
    }
    await page.waitForTimeout(80);
  }
  throw new Error('hand did not finish');
}
