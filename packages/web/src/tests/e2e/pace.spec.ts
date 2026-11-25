import { expect, test } from '@playwright/test';
import { saveShot } from './visible-hand';

test.describe('table pace', () => {
  test.describe.configure({ timeout: 60_000 });

  test('speed toggle is in the top bar at 390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'declared', '250');
    const speed = page.getByTestId('speed-toggle');
    await expect(speed).toHaveAttribute('aria-label', 'Speed 1x');
    await expect(speed).toHaveAttribute('aria-pressed', 'false');
    const box = await speed.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await speed.click();
    await expect(speed).toHaveAttribute('aria-label', 'Speed 2x');
    await expect(speed).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await open(page, 'declared', '250');
    await expect(page.getByTestId('speed-toggle')).toHaveAttribute('aria-label', 'Speed 2x');
    await saveShot(page, '/opt/cursor/artifacts/pace-2x-toggle-390.png', false);
    await page.getByTestId('speed-toggle').click();
  });

  test('the game name stays whole at 360 and 320', async ({ page }) => {
    for (const width of [360, 320]) {
      await page.setViewportSize({ width, height: 700 });
      await open(page, 'declared', '500');
      const title = page.getByTestId('table-title');
      await expect(title).toHaveText('Play vs bots · 500');
      const fit = await title.evaluate((node) => {
        const box = node.getBoundingClientRect();
        return { scroll: node.scrollWidth, client: node.clientWidth, left: box.left, right: box.right };
      });
      expect(fit.scroll).toBeLessThanOrEqual(fit.client + 1);
      expect(fit.left).toBeGreaterThanOrEqual(0);
      expect(fit.right).toBeLessThanOrEqual(width);
    }
  });

  test('a short fan stays centred', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await openCount(page, 2, '500');
    await expect(page.getByTestId('hand-card')).toHaveCount(2);
    await expectCentredFan(page);
    await saveShot(page, '/opt/cursor/artifacts/handfan-500-2cards-667x375.png', false);
    await page.setViewportSize({ width: 390, height: 844 });
    await openCount(page, 3, '250');
    await expect(page.getByTestId('hand-card')).toHaveCount(3);
    await expectCentredFan(page);
    await saveShot(page, '/opt/cursor/artifacts/handfan-250-3cards-390.png', false);
  });

  test('eight trick cards keep seat labels inside 360 and 667', async ({ page }) => {
    for (const view of [
      { width: 360, height: 740, shot: 'trick-labels-500-360.png' },
      { width: 667, height: 375, shot: 'trick-labels-500-667x375.png' },
    ]) {
      await page.setViewportSize({ width: view.width, height: view.height });
      await open(page, 'labels', '500');
      await expect(page.getByTestId('trick-seat')).toHaveCount(8);
      await expect(page.getByTestId('trick-leader')).toContainText('Winning:');
      const fit = await page.evaluate(() => {
        const seats = [...document.querySelectorAll('[data-testid="trick-seat"]')];
        const boxes = seats.map((seat) => seat.getBoundingClientRect());
        return {
          left: Math.min(...boxes.map((box) => box.left)),
          right: Math.max(...boxes.map((box) => box.right)),
          bottom: Math.max(...boxes.map((box) => box.bottom)),
        };
      });
      expect(fit.left).toBeGreaterThanOrEqual(0);
      expect(fit.right).toBeLessThanOrEqual(view.width);
      expect(fit.bottom).toBeLessThanOrEqual(view.height);
      await saveShot(page, `/opt/cursor/artifacts/${view.shot}`, false);
    }
  });

  test('a forced follow lifts then plays', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'forced', '250');
    const lifted = page.locator('[data-forced="true"]');
    await expect(lifted).toBeVisible();
    await saveShot(page, '/opt/cursor/artifacts/forced-autoplay-390.png', false);
    await expect(lifted).toHaveCount(0, { timeout: 2_000 });
  });

  test('bid made and bid sunk banners', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await open(page, 'lock-made', '250');
    const made = page.getByTestId('bid-lock-banner');
    await expect(made).toHaveText('Bid made!');
    await expect.poll(async () => made.evaluate((node) => Number(getComputedStyle(node).opacity))).toBeGreaterThan(0.9);
    await saveShot(page, '/opt/cursor/artifacts/bid-made-banner-667x375.png', false);
    await open(page, 'lock-sunk', '250');
    const sunk = page.getByTestId('bid-lock-banner');
    await expect(sunk).toHaveText('Bid sunk!');
    await expect.poll(async () => sunk.evaluate((node) => Number(getComputedStyle(node).opacity))).toBeGreaterThan(0.9);
    await saveShot(page, '/opt/cursor/artifacts/bid-sunk-banner-667x375.png', false);
  });

  test('finish hand appears after the lock', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'lock-made', '250');
    const button = page.getByTestId('finish-hand');
    await expect(button).toBeVisible();
    const banner = page.getByTestId('bid-lock-banner');
    await expect.poll(async () => banner.evaluate((node) => Number(getComputedStyle(node).opacity))).toBeGreaterThan(0.9);
    await saveShot(page, '/opt/cursor/artifacts/finish-hand-button-390.png', false);
  });

  test('hand edges stay inside 360, 390 and 667', async ({ page }) => {
    for (const view of [
      { width: 360, height: 740, script: 'trick', variant: '500' as const, shot: 'handfan-500-360.png' },
      { width: 390, height: 844, script: 'trick', variant: '500' as const, shot: 'handfan-500-390.png' },
      { width: 667, height: 375, script: 'trick', variant: '250' as const, shot: 'handfan-250-667x375.png' },
    ]) {
      await page.setViewportSize({ width: view.width, height: view.height });
      await open(page, view.script, view.variant);
      await expect(page.getByTestId('hand-fan')).toBeVisible();
      const edge = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('[data-testid="hand-card"]')];
        const boxes = cards.map((card) => card.getBoundingClientRect());
        const left = Math.min(...boxes.map((box) => box.left));
        const right = Math.max(...boxes.map((box) => box.right));
        return { left, rightGap: window.innerWidth - right };
      });
      expect(edge.left).toBeGreaterThanOrEqual(11.9);
      expect(edge.rightGap).toBeGreaterThanOrEqual(11.9);
      await saveShot(page, `/opt/cursor/artifacts/${view.shot}`, false);
    }
  });
});

async function open(page: import('@playwright/test').Page, script: string, variant: '250' | '500'): Promise<void> {
  await page.goto(`/play?script=${script}`);
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').click();
  await page.keyboard.type('Ada');
  await page.getByTestId('start-vs-bots').click();
}

async function openCount(page: import('@playwright/test').Page, count: number, variant: '250' | '500'): Promise<void> {
  await page.goto(`/play?script=cards&n=${count}`);
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').click();
  await page.keyboard.type('Ada');
  await page.getByTestId('start-vs-bots').click();
}

async function expectCentredFan(page: import('@playwright/test').Page): Promise<void> {
  const placed = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid="hand-card"]')].map((card) => card.getBoundingClientRect());
    const left = Math.min(...cards.map((box) => box.left));
    const right = Math.max(...cards.map((box) => box.right));
    const width = cards[0]?.width ?? 0;
    const strip = cards.length > 1 ? cards[1]!.left - cards[0]!.left : 0;
    return { mid: (left + right) / 2, screen: window.innerWidth, strip, width };
  });
  expect(Math.abs(placed.mid - placed.screen / 2)).toBeLessThan(24);
  if (placed.width > 0) expect(placed.strip).toBeLessThan(placed.width);
}
