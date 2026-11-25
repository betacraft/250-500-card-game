import { expect, test, type Page } from '@playwright/test';
import { saveShot } from './visible-hand';

const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

test.describe('lock banners match the recap', () => {
  test.describe.configure({ timeout: 240_000 });

  test('seed 12346 does not show a false sunk banner', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date(1795600012345));
    await page.goto('/play');
    await page.getByRole('button', { name: /^250/ }).click();
    await page.getByRole('button', { name: 'Normal', exact: true }).click();
    await page.getByLabel('Your name').fill('Ada');
    await page.getByTestId('start-vs-bots').click();
    await expect(page.getByText('Bots: Normal')).toBeVisible();
    const speed = page.getByTestId('speed-toggle');
    if ((await speed.getAttribute('aria-pressed')) !== 'true') await speed.click();
    let sunk = false;
    let made = false;
    let shot = false;
    for (let step = 0; step < 900 && !(await page.getByTestId('hand-complete').isVisible().catch(() => false)); step += 1) {
      const banner = page.getByTestId('bid-lock-banner');
      if (await banner.count()) {
        const text = (await banner.first().textContent()) ?? '';
        if (text.includes('sunk')) sunk = true;
        if (text.includes('made')) made = true;
      }
      const cards = await page.getByTestId('hand-card').count();
      if (!shot && cards === 2 && (await page.getByTestId('trick-row').isVisible().catch(() => false))) {
        await saveShot(page, '/opt/cursor/artifacts/seed12346-trick6-250.png', false);
        shot = true;
      }
      if (await advance(page)) continue;
      await page.waitForTimeout(40);
    }
    expect(sunk, `sunk banner on a made hand (made banner seen=${made})`).toBe(false);
    expect(shot, 'trick 6 shot').toBe(true);
    const recap = page.getByTestId('hand-complete');
    await expect(recap).toBeVisible();
    await expect(recap).toContainText('Bid made');
    await expect(recap).toContainText('195');
    await expect(recap).toContainText('295');
    await expect(page.getByTestId('bid-lock-banner')).toHaveCount(0);
  });

  test('the banner is gone by the recap across 6 hands at 2x', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('/play');
    await page.getByRole('button', { name: /^250/ }).click();
    await page.getByLabel('Your name').fill('Ada');
    await page.getByTestId('start-vs-bots').click();
    const speed = page.getByTestId('speed-toggle');
    if ((await speed.getAttribute('aria-pressed')) !== 'true') await speed.click();
    let hands = 0;
    for (let step = 0; step < 4000 && hands < 6; step += 1) {
      if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) {
        await expect(page.getByTestId('bid-lock-banner')).toHaveCount(0);
        hands += 1;
        if (hands === 6) {
          await saveShot(page, '/opt/cursor/artifacts/lock-banner-gone-recap-667x375.png', false);
          break;
        }
        await page.getByTestId('next-hand').click();
        continue;
      }
      if (await advance(page)) continue;
      await page.waitForTimeout(30);
    }
    expect(hands).toBe(6);
  });

  test('game over rows stay reachable at 667x375', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('/play?target=1');
    await page.getByRole('button', { name: /^250/ }).click();
    await page.getByLabel('Your name').fill('Ada');
    await page.getByTestId('start-vs-bots').click();
    const speed = page.getByTestId('speed-toggle');
    if ((await speed.getAttribute('aria-pressed')) !== 'true') await speed.click();
    for (let step = 0; step < 2500 && !(await page.getByTestId('game-over').isVisible().catch(() => false)); step += 1) {
      if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) {
        await expect(page.getByTestId('bid-lock-banner')).toHaveCount(0);
        const next = page.getByTestId('next-hand');
        if (await next.isVisible().catch(() => false)) await next.click();
        continue;
      }
      if (await advance(page)) continue;
      await page.waitForTimeout(30);
    }
    await expect(page.getByTestId('game-over')).toBeVisible();
    await expect(page.getByTestId('bid-lock-banner')).toHaveCount(0);
    const bidder = page.locator('[data-testid="score-delta"][data-role="bidder"]');
    const last = page.getByTestId('score-delta').last();
    await bidder.scrollIntoViewIfNeeded();
    await last.scrollIntoViewIfNeeded();
    expect(await hit(page, bidder)).toBe(true);
    expect(await hit(page, last)).toBe(true);
    expect(await hit(page, page.getByTestId('play-again'))).toBe(true);
  });
});

async function advance(page: Page): Promise<boolean> {
  const pass = page.getByRole('button', { name: 'Pass' });
  if (await pass.isVisible().catch(() => false)) {
    await pass.click();
    return true;
  }
  const declare = page.getByTestId('declare-form');
  if (await declare.isVisible().catch(() => false)) {
    const ranks = ['A', 'K', 'Q', 'J', '10', '9'];
    for (let i = 0; i < 2; i += 1) {
      const rank = ranks[i] ?? 'A';
      await page.locator(`[data-testid="declare-form"] button[aria-label^="${rank} of hearts"]`).click();
    }
    await page.getByRole('button', { name: 'Confirm declaration' }).click();
    return true;
  }
  return playLowest(page);
}

async function playLowest(page: Page): Promise<boolean> {
  const point = await page.evaluate((order) => {
    const buttons = [...document.querySelectorAll('[data-testid="hand-card"]')].filter((button) => button.getAttribute('aria-disabled') !== 'true');
    buttons.sort((a, b) => order.indexOf(a.getAttribute('data-rank') ?? '') - order.indexOf(b.getAttribute('data-rank') ?? ''));
    const button = buttons[0];
    if (!(button instanceof HTMLElement)) return null;
    const svg = button.querySelector('svg');
    if (!(svg instanceof SVGSVGElement)) return null;
    const label = button.getAttribute('aria-label') ?? '';
    const ctm = svg.getScreenCTM();
    const at = (x: number, y: number): { x: number; y: number } => {
      const spot = svg.createSVGPoint();
      spot.x = x;
      spot.y = y;
      const screen = ctm ? spot.matrixTransform(ctm) : spot;
      return { x: screen.x, y: screen.y };
    };
    const labelAt = (x: number, y: number): string => document.elementFromPoint(x, y)?.closest('[data-testid="hand-card"]')?.getAttribute('aria-label') ?? '';
    return [at(48, 70), at(48, 140), at(125, 175)].find((item) => labelAt(item.x, item.y) === label) ?? null;
  }, RANKS);
  if (!point) return false;
  await page.mouse.click(point.x, point.y);
  const play = page.getByTestId('confirm-play');
  if (await play.isVisible().catch(() => false)) await play.click();
  return true;
}

async function hit(page: Page, locator: ReturnType<Page['locator']>): Promise<boolean> {
  const box = await locator.boundingBox();
  if (!box) return false;
  return page.evaluate(({ x, y }) => {
    const node = document.elementFromPoint(x, y);
    const row = node?.closest('[data-testid="score-delta"], [data-testid="play-again"]');
    return row !== null;
  }, { x: box.x + box.width / 2, y: box.y + Math.min(box.height / 2, 8) });
}
