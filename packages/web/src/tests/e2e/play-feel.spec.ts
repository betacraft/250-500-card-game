import { saveShot } from './visible-hand';
import { expect, test, type Locator, type Page } from '@playwright/test';

test.describe.configure({ timeout: 300_000 });

test('a variant tap within 50ms of the picker selects it', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 572 });
  await start250(page);
  await mouseCentre(page, page.getByTestId('new-game'));
  await mouseCentre(page, page.getByTestId('abandon-yes'));
  const picker = page.getByTestId('variant-picker');
  await picker.waitFor({ state: 'visible' });
  await saveShot(page, '/opt/cursor/artifacts/variant-picker-1024.png', false);
  const fiveHundred = page.locator('[data-variant="500"]');
  const box = await fiveHundred.boundingBox();
  if (!box) throw new Error('variant picker has no box');
  await page.waitForTimeout(50);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(fiveHundred).toHaveAttribute('aria-pressed', 'true');
});

test('Play within 100, 300 and 800ms never asks to choose a card', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 572 });
  await start250(page);
  await reachTable(page);
  const need: Record<number, number> = { 100: 20, 300: 20, 800: 20 };
  const delays = [100, 300, 800];
  let cursor = 0;
  for (let guard = 0; guard < 80 && delays.some((delay) => (need[delay] ?? 0) > 0); guard += 1) {
    const delay = delays[cursor % delays.length] ?? 100;
    cursor += 1;
    if ((need[delay] ?? 0) <= 0) continue;
    await playOne(page, delay);
    need[delay] = (need[delay] ?? 0) - 1;
  }
  expect(need).toEqual({ 100: 0, 300: 0, 800: 0 });
});

async function start250(page: Page): Promise<void> {
  await page.goto('/play');
  await mouseCentre(page, page.getByRole('button', { name: /^250/ }));
  await mouseCentre(page, page.getByLabel('Your name'));
  await page.keyboard.type('Ada');
  await mouseCentre(page, page.getByTestId('start-vs-bots'));
  await page.getByTestId('hand-fan').waitFor();
}

async function reachTable(page: Page): Promise<void> {
  for (let guard = 0; guard < 80; guard += 1) {
    if (await page.getByText('Your turn').isVisible().catch(() => false)) return;
    if (await page.getByTestId('declare-form').isVisible().catch(() => false)) {
      await declareMinimum(page);
      await expect(page.getByText('Your turn')).toBeVisible({ timeout: 20_000 });
      return;
    }
    const bid = page.getByRole('button', { name: /^Bid / });
    if (await bid.isVisible().catch(() => false)) {
      await raiseToMax(page);
      await mouseCentre(page, bid);
      continue;
    }
    await page.waitForTimeout(40);
  }
  throw new Error('did not reach the table');
}

async function playOne(page: Page, delay: number): Promise<void> {
  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 20_000 });
  const card = page.locator('[data-testid="hand-card"][aria-disabled="false"]').last();
  const rank = await card.getAttribute('data-rank');
  await mouseCentre(page, card);
  const playButton = page.getByTestId('confirm-play');
  await expect(playButton).toHaveText(new RegExp(`Play ${rank}`));
  await page.waitForTimeout(delay);
  if (!(await page.getByText('Your turn').isVisible().catch(() => false))) {
    await advanceToTurn(page);
    return;
  }
  const label = (await playButton.textContent()) ?? '';
  if (!label.includes(String(rank))) {
    const again = page.locator(`[data-testid="hand-card"][data-rank="${rank}"][aria-disabled="false"]`).last();
    if ((await again.count()) === 0) {
      await advanceToTurn(page);
      return;
    }
    await mouseCentre(page, again);
    await expect(playButton).toHaveText(new RegExp(`Play ${rank}`));
  }
  await mouseCentre(page, playButton);
  await expect(page.getByTestId('disabled-reason')).not.toContainText(/choose a card/i);
  await expect(page.getByText('Your turn')).toBeHidden({ timeout: 5_000 });
  await advanceToTurn(page);
}

async function advanceToTurn(page: Page): Promise<void> {
  for (let guard = 0; guard < 80; guard += 1) {
    if (await page.getByText('Your turn').isVisible().catch(() => false)) return;
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) {
      await mouseCentre(page, page.getByRole('button', { name: 'Next hand' }));
      await reachTable(page);
      return;
    }
    const pause = page.getByTestId('trick-pause');
    const point = await centre(pause, 50);
    if (point) {
      await page.mouse.click(point.x, point.y);
      continue;
    }
    await page.waitForTimeout(40);
  }
  throw new Error('the next turn did not arrive');
}

async function declareMinimum(page: Page): Promise<void> {
  await mouseCentre(page, page.getByRole('button', { name: 'Trump: Spades' }));
  const grid = page.getByTestId('declare-form');
  await mouseCentre(page, grid.getByRole('button', { name: /^3 of clubs/ }));
  await mouseCentre(page, grid.getByRole('button', { name: /^4 of clubs/ }));
  const confirm = page.getByRole('button', { name: 'Confirm declaration' });
  await expect(confirm).toHaveAttribute('aria-disabled', 'false');
  await mouseCentre(page, confirm);
}

async function raiseToMax(page: Page): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    const add = page.getByRole('button', { name: 'Add 20 to the bid' });
    if ((await add.getAttribute('aria-disabled')) === 'true') return;
    await mouseCentre(page, add);
  }
}

async function mouseCentre(page: Page, locator: Locator): Promise<void> {
  const point = await centre(locator);
  if (!point) throw new Error('control has no box');
  await page.mouse.click(point.x, point.y);
}

async function centre(locator: Locator, timeout = 1_000): Promise<{ x: number; y: number } | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await expect(locator).toBeVisible({ timeout });
    } catch {
      return null;
    }
    const box = await locator.boundingBox({ timeout: 300 }).catch(() => null);
    if (box) return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }
  return null;
}
