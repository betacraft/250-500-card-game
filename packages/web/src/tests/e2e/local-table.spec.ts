import { expect, test } from '@playwright/test';
import { assertHandCorners } from './visible-hand';

async function playOneHand(
  page: import('@playwright/test').Page,
  variant: '250' | '500',
  difficulty: 'Easy' | 'Normal' = 'Easy',
): Promise<void> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/play');
  await expect(page.getByText(/no coins, no stakes/i)).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await expect(page.getByRole('button', { name: 'Easy', exact: true })).toHaveAttribute('aria-pressed', 'true');
  if (difficulty === 'Normal') await page.getByRole('button', { name: 'Normal', exact: true }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByTestId('start-vs-bots').click();
  await expect(page.getByText(`Bots: ${difficulty}`)).toBeVisible();
  await expect(page.getByTestId('hand-fan')).toBeVisible();
  await expect(page.getByTestId('hand-card')).toHaveCount(variant === '250' ? 8 : 12);
  const label = test.info().title.replace(/\s+/g, '-').toLowerCase();
  await page.screenshot({ path: `/opt/cursor/artifacts/bidding-hand-${label}.png`, fullPage: true });
  const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(scrolls).toBe(false);
  let paused = false;
  let hiddenShot = false;
  for (let step = 0; step < 500; step += 1) {
    if (variant === '250' && !hiddenShot && (await page.getByText('Partners: none yet').isVisible().catch(() => false))) {
      await page.screenshot({ path: `/opt/cursor/artifacts/hidden-partners-${label}.png`, fullPage: true });
      hiddenShot = true;
    }
    if (await holdTrickPause(page, label, paused)) {
      paused = true;
      continue;
    }
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) break;
    const pass = page.getByRole('button', { name: 'Pass' });
    if (await pass.isVisible().catch(() => false)) {
      await pass.click();
      continue;
    }
    const card = page.locator('[data-testid="hand-card"][aria-disabled="false"]').first();
    if (await card.isVisible().catch(() => false)) {
      await card.click({ force: true });
      await page.getByTestId('confirm-play').click();
      continue;
    }
    await page.waitForTimeout(60);
  }
  await expect(page.getByTestId('hand-complete')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('score-explainer')).toBeVisible();
  if (label === '250-mobile') {
    await page.getByTestId('hand-complete').screenshot({ path: '/opt/cursor/artifacts/result-explainer-390.png' });
  }
  await page.screenshot({ path: `/opt/cursor/artifacts/local-table-${label}.png`, fullPage: true });
  expect(errors, errors.join('\n')).toEqual([]);
}

async function holdTrickPause(page: import('@playwright/test').Page, label: string, alreadyShot: boolean): Promise<boolean> {
  const pause = page.getByTestId('trick-pause');
  if (!(await pause.isVisible().catch(() => false))) return false;
  if (!alreadyShot) {
    const spills = await page.getByTestId('trick-row').evaluate((row) => {
      const box = row.getBoundingClientRect();
      return box.left < -1 || box.right > window.innerWidth + 1;
    });
    expect(spills).toBe(false);
    await page.screenshot({ path: `/opt/cursor/artifacts/trick-pause-${label}.png`, fullPage: true });
  }
  await expect(pause).toBeHidden({ timeout: 5_000 });
  return true;
}

async function shootSelector(page: import('@playwright/test').Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/play');
  await page.getByRole('button', { name: /^250/ }).click();
  await expect(page.getByTestId('difficulty-easy')).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: `/opt/cursor/artifacts/difficulty-${width}x${height}.png`, fullPage: false });
}

async function expectDeclarationHand(
  page: import('@playwright/test').Page,
  width: number,
  height: number,
  shot: string,
): Promise<void> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.goto('/play');
  await page.getByRole('button', { name: /^250/ }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByTestId('start-vs-bots').click();
  for (let i = 0; i < 8; i += 1) {
    const add = page.getByRole('button', { name: 'Add 20 to the bid' });
    if (!(await add.isVisible().catch(() => false))) break;
    if (await add.isDisabled()) break;
    await add.click();
  }
  await page.getByRole('button', { name: /^Bid / }).click();
  await expect(page.getByTestId('declare-form')).toBeVisible();
  await assertHandCorners(page);
  const fan = page.getByTestId('hand-fan');
  await expect(fan).toBeVisible();
  const box = await fan.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.y ?? 0) + (box?.height ?? 999)).toBeLessThanOrEqual(height);
  const scroll = await page.evaluate(() => window.scrollY);
  expect(scroll).toBe(0);
  await expect(page.locator('[data-held="true"]')).toHaveCount(8);
  await expect(page.getByTestId('score-explainer')).toContainText('bid + 100');
  if (height > 760) await expect(page.getByTestId('auction-recap')).toBeVisible();
  await page.screenshot({ path: shot, fullPage: false });
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

  test('declaration hand is on screen at 390', async ({ page }) => {
    await expectDeclarationHand(page, 390, 844, '/opt/cursor/artifacts/declare-hand-390.png');
  });

  test('declaration hand is on screen at 1024', async ({ page }) => {
    await expectDeclarationHand(page, 1024, 572, '/opt/cursor/artifacts/declare-hand-1024.png');
  });

  test('declaration hand is on screen at 1366', async ({ page }) => {
    await expectDeclarationHand(page, 1366, 768, '/opt/cursor/artifacts/declare-hand-1366.png');
  });

  test('normal hand at 360', async ({ page }) => {
    test.setTimeout(180_000);
    await shootSelector(page, 360, 740);
    await playOneHand(page, '250', 'Normal');
  });

  test('normal hand at 1024', async ({ page }) => {
    test.setTimeout(180_000);
    await shootSelector(page, 1024, 572);
    await playOneHand(page, '250', 'Normal');
  });

  test('declare button is on screen at 390', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/play');
    await page.getByRole('button', { name: /^250/ }).click();
    await page.getByLabel('Your name').fill('Ada');
    await page.getByTestId('start-vs-bots').click();
    for (let i = 0; i < 8; i += 1) {
      const add = page.getByRole('button', { name: 'Add 20 to the bid' });
      if (!(await add.isVisible().catch(() => false))) break;
      if (await add.isDisabled()) break;
      await add.click();
    }
    await page.getByRole('button', { name: /^Bid / }).click();
    const confirm = page.getByRole('button', { name: 'Confirm declaration' });
    await expect(confirm).toBeVisible();
    const box = await confirm.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? 999) + (box?.height ?? 0)).toBeLessThanOrEqual(844);
    expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: '/opt/cursor/artifacts/declare-footer-390.png', fullPage: false });
    expect(errors).toEqual([]);
  });
});
