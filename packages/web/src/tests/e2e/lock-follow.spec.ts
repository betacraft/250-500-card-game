import { expect, test, type Page } from '@playwright/test';
import { confirmPlay } from './confirm-play';
import { saveShot } from './visible-hand';

const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

test.describe('latched lock and a clean next hand', () => {
  test.describe.configure({ timeout: 300_000 });

  test('Finish stays up on the trick after the lock', async ({ page }) => {
    const errors = watch(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await begin(page, '250', 'Normal');
    let shot = false;
    for (let step = 0; step < 2500 && !shot; step += 1) {
      if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) {
        await page.getByTestId('next-hand').click();
        continue;
      }
      const finish = page.getByTestId('finish-hand');
      const cards = await page.getByTestId('hand-card').count();
      const trick = await page.getByTestId('trick-card').count() + await page.getByTestId('trick-winner').count();
      if ((await finish.isVisible().catch(() => false)) && cards > 0 && cards <= 2 && trick > 0) {
        await expect(finish).toBeVisible();
        await saveShot(page, '/opt/cursor/artifacts/finish-latched-trick7-250.png', false);
        shot = true;
        break;
      }
      if (await advance(page)) continue;
      await page.waitForTimeout(30);
    }
    expect(shot, 'Finish still visible mid-trick after the lock').toBe(true);
    expect(errors).toEqual([]);
  });

  test('a quick Next hand does not carry a toast or a star', async ({ page }) => {
    const errors = watch(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/play?target=10000');
    await begin(page, '500', 'Normal');
    let hands = 1;
    let shot = false;
    const seen = new Set<number>();
    for (let step = 0; step < 6000 && hands <= 10; step += 1) {
      const trick = (await page.getByTestId('trick-card').count()) + (await page.getByTestId('trick-winner').count());
      const live = await page.getByTestId('trick-live').isVisible().catch(() => false);
      if (live && trick === 0 && !seen.has(hands)) {
        await assertQuiet(page);
        seen.add(hands);
        if (hands === 2) {
          await saveShot(page, '/opt/cursor/artifacts/next-hand-no-leak-500-1280.png', false);
          shot = true;
        }
      }
      if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) {
        if (hands >= 10) break;
        await page.getByTestId('next-hand').click();
        hands += 1;
        continue;
      }
      if (await advance(page)) continue;
      await page.waitForTimeout(15);
    }
    expect(hands).toBeGreaterThanOrEqual(10);
    expect(shot).toBe(true);
    expect(seen.size).toBeGreaterThanOrEqual(10);
    expect(errors).toEqual([]);
  });

  test('a last-trick lock opens the recap with the result', async ({ page }) => {
    const errors = watch(page);
    await page.setViewportSize({ width: 667, height: 375 });
    await begin(page, '250', 'Normal');
    let made = false;
    let sunk = false;
    for (let step = 0; step < 4000 && (!made || !sunk); step += 1) {
      const header = page.getByTestId('recap-header');
      if (await header.isVisible().catch(() => false)) {
        const kind = await header.getAttribute('data-lock');
        await expect(page.getByTestId('bid-lock-banner')).toHaveCount(0);
        await expect(page.getByTestId('finish-hand')).toHaveCount(0);
        if (kind === 'made' && !made) {
          await page.setViewportSize({ width: 667, height: 375 });
          await saveShot(page, '/opt/cursor/artifacts/recap-header-made-667x375.png', false);
          made = true;
        }
        if (kind === 'sunk' && !sunk) {
          await page.setViewportSize({ width: 360, height: 800 });
          await saveShot(page, '/opt/cursor/artifacts/recap-header-sunk-360x800.png', false);
          sunk = true;
        }
        const next = page.getByTestId('next-hand');
        if (await next.isVisible().catch(() => false)) await next.click();
        continue;
      }
      if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) {
        const next = page.getByTestId('next-hand');
        if (await next.isVisible().catch(() => false)) await next.click();
        continue;
      }
      if (await advance(page)) continue;
      await page.waitForTimeout(20);
    }
    expect(made).toBe(true);
    expect(sunk).toBe(true);
    expect(errors).toEqual([]);
  });

  test('New game mid-hand drops the partner cue', async ({ page }) => {
    const errors = watch(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await begin(page, '500', 'Normal');
    let played = false;
    for (let step = 0; step < 400 && !played; step += 1) {
      if ((await page.getByTestId('trick-card').count()) + (await page.getByTestId('trick-winner').count()) > 0) played = true;
      if (await advance(page)) continue;
      await page.waitForTimeout(30);
    }
    expect(played).toBe(true);
    await page.getByTestId('new-game').click();
    await page.getByTestId('abandon-yes').click();
    await expect(page.getByRole('button', { name: /^250/ })).toBeVisible();
    await begin(page, '500', 'Normal');
    for (let step = 0; step < 120 && !(await page.getByText('Partners: none yet').isVisible().catch(() => false)); step += 1) {
      if (await advance(page)) continue;
      await page.waitForTimeout(40);
    }
    await expect(page.getByText('Partners: none yet')).toBeVisible();
    await assertQuiet(page);
    await saveShot(page, '/opt/cursor/artifacts/new-game-midhand-no-leak-500-1280.png', false);
    expect(errors).toEqual([]);
  });
});

function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function begin(page: Page, variant: '250' | '500', difficulty: 'Easy' | 'Normal'): Promise<void> {
  if (!page.url().includes('/play')) await page.goto('/play');
  const choice = page.getByRole('button', { name: new RegExp(`^${variant}`) });
  await expect(choice).toBeVisible();
  await choice.click();
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  if (difficulty === 'Normal') await page.getByRole('button', { name: 'Normal', exact: true }).click();
  await page.getByLabel('Your name').fill('Ada');
  const autoPlay = page.getByTestId('autoplay-toggle');
  if ((await autoPlay.getAttribute('aria-pressed')) === 'true') await autoPlay.click();
  await page.getByTestId('start-vs-bots').click();
  await expect(page.getByTestId('speed-toggle')).toBeVisible();
  const speed = page.getByTestId('speed-toggle');
  if ((await speed.getAttribute('aria-pressed')) !== 'true') await speed.click();
}

async function assertQuiet(page: Page): Promise<void> {
  const quiet = await page.evaluate(() => ({
    toast: document.querySelectorAll('[data-testid="partner-toast-pill"]').length,
    glow: document.querySelectorAll('.partner-glow').length,
    badge: document.querySelectorAll('[data-testid="partner-badge"]').length,
    star: document.querySelectorAll('[data-testid="private-star"]').length,
    hold: (document.querySelector('[data-testid="private-partner"]')?.textContent ?? '').includes('hold a called card'),
  }));
  expect(quiet.toast).toBe(0);
  expect(quiet.glow).toBe(0);
  expect(quiet.badge).toBe(0);
  if (!quiet.hold) expect(quiet.star).toBe(0);
}

async function advance(page: Page): Promise<boolean> {
  const pause = page.getByTestId('trick-pause');
  if (await pause.isVisible().catch(() => false)) {
    await pause.click({ timeout: 1_000 }).catch(() => undefined);
    return true;
  }
  const pass = page.getByRole('button', { name: 'Pass' });
  if (await pass.isVisible().catch(() => false)) {
    await pass.click();
    return true;
  }
  const declare = page.getByTestId('declare-form');
  if (await declare.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Trump: Hearts' }).click();
    const title = (await page.getByTestId('table-title').textContent()) ?? '';
    const need = title.includes('500') ? 3 : 2;
    const labels = await page.locator('[data-testid="declare-form"] button[aria-label*=" of "]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('aria-label') ?? '').filter((label) => label.length > 0 && !label.includes('in your hand')),
    );
    for (const label of labels.slice(0, need)) await page.locator(`[data-testid="declare-form"] button[aria-label="${label}"]`).click();
    const confirm = page.getByRole('button', { name: 'Confirm declaration' });
    await expect(confirm).toBeEnabled({ timeout: 2_000 });
    await confirm.click();
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
  await confirmPlay(page);
  return true;
}
