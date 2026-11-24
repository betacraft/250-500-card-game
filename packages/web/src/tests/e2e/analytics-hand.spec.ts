import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const views = [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
] as const;

test.describe('analytics during a real hand', () => {
  for (const view of views) {
    test(`250 hand at ${view.width}x${view.height}`, async ({ page }) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize(view);
      await page.goto('/play?analytics=1&debug=1');
      await page.getByRole('button', { name: /^250/ }).click();
      await page.getByLabel('Your name').click();
      await page.keyboard.type('Ada');
      await page.getByTestId('start-vs-bots').click();
      await page.getByTestId('hand-fan').waitFor();
      if (view.width === 390) await assertExportClear(page, true);
      for (let guard = 0; guard < 16; guard += 1) {
        const bid = page.getByRole('button', { name: /^Bid / });
        await expect(bid.or(page.getByTestId('declare-form')).or(page.getByText('Your turn'))).toBeVisible({ timeout: 20_000 });
        if (!(await bid.isVisible().catch(() => false))) break;
        const add = page.getByRole('button', { name: 'Add 20 to the bid' });
        for (let step = 0; step < 20; step += 1) {
          if ((await add.getAttribute('aria-disabled')) === 'true') break;
          await add.click();
        }
        await bid.click();
      }
      await finishHand(page);
      await expect(page.getByTestId('hand-complete')).toBeVisible();
      await page.screenshot({ path: `/opt/cursor/artifacts/analytics-hand-${view.width}.png`, fullPage: false });
      await page.getByTestId('new-game').click();
      await page.getByTestId('abandon-yes').click();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByTestId('export-analytics').click(),
      ]);
      const events = await page.evaluate(() => window.__analytics?.events() ?? []);
      writeFileSync(`/opt/cursor/artifacts/analytics-events-${view.width}.json`, JSON.stringify(events, null, 2));
      expect(download.suggestedFilename()).toBe('analytics.json');
      const order = events.map((event) => event.name);
      let cursor = 0;
      for (const name of ['session_start', 'game_start', 'hand_start', 'bid_placed', 'auction_won', 'cards_called', 'hand_complete', 'first_hand_finished', 'game_abandoned', 'new_game']) {
        const at = order.indexOf(name, cursor);
        expect(at, name).toBeGreaterThanOrEqual(0);
        cursor = at + 1;
      }
      const complete = events.find((event) => event.name === 'hand_complete');
      expect(typeof complete?.props.made).toBe('boolean');
      expect(typeof complete?.props.bid).toBe('number');
      expect(typeof complete?.props.points).toBe('number');
      expect(typeof complete?.props.bidder_is_human).toBe('boolean');
      expect(events.find((event) => event.name === 'bid_placed')?.props.action === 'bid' || events.find((event) => event.name === 'bid_placed')?.props.action === 'pass').toBe(true);
      expect(events.find((event) => event.name === 'session_end')).toBeUndefined();
      expect(events.find((event) => event.name === 'game_complete')).toBeUndefined();
      expect(events.find((event) => event.name === 'game_abandoned')?.props).toMatchObject({ reason: 'new_game', hands_played: 1 });
      expect(events.every((event) => event.game === '250' || event.name === 'session_start' || event.name === 'new_game' || event.game === null)).toBe(true);
      const exported = JSON.parse(await page.evaluate(() => window.__analytics?.export() ?? '{}')) as { enabled: boolean };
      expect(exported.enabled).toBe(true);
      expect(errors, errors.join('\n')).toEqual([]);
    });

    test(`export button clears the header at ${view.width}x${view.height}`, async ({ page }) => {
      await page.setViewportSize(view);
      await page.goto('/play?analytics=1&debug=1');
      await page.getByRole('button', { name: /^250/ }).click();
      await page.getByLabel('Your name').click();
      await page.keyboard.type('Ada');
      await page.getByTestId('start-vs-bots').click();
      await page.getByTestId('hand-fan').waitFor();
      await assertExportClear(page, view.height > 760);
    });
  }

  test('export button clears the header at 360x740', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/play?analytics=1&debug=1');
    await page.getByRole('button', { name: /^250/ }).click();
    await page.getByLabel('Your name').click();
    await page.keyboard.type('Ada');
    await page.getByTestId('start-vs-bots').click();
    await page.getByTestId('hand-fan').waitFor();
    await assertExportClear(page, false);
    await page.screenshot({ path: '/opt/cursor/artifacts/analytics-export-360.png', fullPage: false });
  });

  test('a short target ends the game for real', async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/play?analytics=1&debug=1&target=1');
    await page.getByRole('button', { name: /^250/ }).click();
    await page.getByLabel('Your name').click();
    await page.keyboard.type('Ada');
    await page.getByTestId('start-vs-bots').click();
    await page.getByTestId('hand-fan').waitFor();
    for (let hand = 0; hand < 8; hand += 1) {
      await passAuction(page);
      await finishHand(page);
      if (await page.getByTestId('game-over').isVisible().catch(() => false)) break;
      await page.getByRole('button', { name: 'Next hand' }).click();
    }
    await expect(page.getByTestId('game-over')).toBeVisible();
    const again = page.getByTestId('play-again');
    await expect(again).toBeVisible();
    await page.screenshot({ path: '/opt/cursor/artifacts/analytics-play-again-1366.png', fullPage: false });
    await page.setViewportSize({ width: 360, height: 740 });
    await page.screenshot({ path: '/opt/cursor/artifacts/analytics-play-again-360.png', fullPage: false });
    const box = await again.boundingBox();
    if (!box) throw new Error('missing Play again');
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(740 - (box.y + box.height)).toBeGreaterThanOrEqual(34);
    await again.focus();
    await expect(again).toBeFocused();
    await again.click();
    await expect(page.getByTestId('abandon-confirm')).toHaveCount(0);
    await expect(page.getByTestId('game-over')).toHaveCount(0);
    await expect(page.getByTestId('hand-fan')).toBeVisible();
    const events = await page.evaluate(() => window.__analytics?.events() ?? []);
    writeFileSync('/opt/cursor/artifacts/analytics-events-game-over.json', JSON.stringify(events, null, 2));
    const after = await page.evaluate(() => window.__analytics?.events() ?? []);
    expect(after.some((event) => event.name === 'game_complete')).toBe(true);
    expect(after.some((event) => event.name === 'game_abandoned')).toBe(false);
    expect(after.some((event) => event.name === 'new_game')).toBe(false);
    const starts = after.filter((event) => event.name === 'game_start');
    expect(starts[0]?.props.replay).toBe(false);
    expect(starts.at(-1)?.props.replay).toBe(true);
    expect(after.filter((event) => event.name === 'game_complete')).toHaveLength(1);
    const complete = events.find((event) => event.name === 'game_complete');
    expect(Number(complete?.props.hands_played)).toBeGreaterThan(0);
    expect(['human', 'bot', 'tie']).toContain(complete?.props.winner);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

async function passAuction(page: Page): Promise<void> {
  for (let guard = 0; guard < 16; guard += 1) {
    const pass = page.getByRole('button', { name: 'Pass', exact: true });
    await expect(pass.or(page.getByTestId('declare-form')).or(page.getByText('Your turn'))).toBeVisible({ timeout: 20_000 });
    if (!(await pass.isVisible().catch(() => false))) return;
    await pass.click();
  }
}

function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function assertExportClear(page: Page, stakes: boolean): Promise<void> {
  const button = await page.getByTestId('export-analytics').boundingBox();
  const title = await page.getByRole('heading', { name: /Play vs bots/ }).boundingBox();
  const home = await page.getByRole('link', { name: 'Home' }).boundingBox();
  if (!button || !title || !home) throw new Error('missing header box');
  expect(button.height).toBeGreaterThanOrEqual(44);
  expect(boxesOverlap(button, title)).toBe(false);
  expect(boxesOverlap(button, home)).toBe(false);
  if (!stakes) return;
  const line = await page.getByText('Free to play. No coins or stakes.').boundingBox();
  if (!line) throw new Error('missing stakes line');
  expect(boxesOverlap(button, line)).toBe(false);
}

async function finishHand(page: Page): Promise<void> {
  for (let guard = 0; guard < 500; guard += 1) {
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) return;
    if (await page.getByTestId('declare-form').isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Trump: Hearts' }).click();
      const grid = page.getByTestId('rank-grid');
      await grid.getByRole('button', { name: /3 of clubs/ }).click();
      await grid.getByRole('button', { name: /4 of clubs/ }).click();
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
              if (hit === card || card.contains(hit)) return { x, y, label: card.getAttribute('aria-label') };
            }
          }
        }
        return null;
      });
      if (!point) throw new Error('no open point on a legal card');
      await page.mouse.click(point.x, point.y);
      await expect(page.getByRole('button', { name: point.label ?? '', exact: true })).toHaveAttribute('data-selected', 'true');
      await page.getByTestId('confirm-play').click();
      continue;
    }
    await page.waitForTimeout(80);
  }
  throw new Error('hand did not finish');
}
