import { expect, test, type Locator, type Page } from '@playwright/test';
import { saveShot } from './visible-hand';

test.describe('short scored hand scrolls its own card', () => {
  test.describe.configure({ timeout: 60_000 });

  for (const item of [
    { variant: '250' as const, width: 667, height: 375, touch: true },
    { variant: '500' as const, width: 667, height: 375, touch: true },
    { variant: '250' as const, width: 800, height: 480, touch: false },
    { variant: '500' as const, width: 800, height: 480, touch: false },
  ]) {
    test(`${item.variant} hand result scrolls at ${item.width}x${item.height}`, async ({ page }) => {
      await page.setViewportSize({ width: item.width, height: item.height });
      await page.goto('/play?script=over');
      await page.getByRole('button', { name: new RegExp(`^${item.variant}`) }).click();
      await page.getByLabel('Your name').click();
      await page.keyboard.type('Ada');
      await page.getByTestId('start-vs-bots').click();
      await expect(page.getByTestId('game-over')).toHaveCount(0);
      const yours = page.getByTestId('your-result');
      await expect(yours).toHaveText(/You [+-]?\d+ \((bidder|partner|opponent)\)/);
      if (item.width === 667) await saveShot(page, `/opt/cursor/artifacts/handcomplete-667x375-${item.variant}.png`, false);
      const card = page.getByTestId('hand-complete');
      const before = await card.evaluate((node) => node.scrollTop);
      await scrollResult(page, card, item.touch);
      const after = await card.evaluate((node) => node.scrollTop);
      expect(after).toBeGreaterThan(before + 20);
      if (item.width === 667) await saveShot(page, `/opt/cursor/artifacts/handcomplete-667x375-${item.variant}-scrolled.png`, false);
      await assertPainted(page.locator('[data-testid="score-delta"][data-role="bidder"]'));
      const partners = page.locator('[data-testid="score-delta"][data-role="partner"]');
      const partnerCount = await partners.count();
      expect(partnerCount).toBeGreaterThan(0);
      for (let index = 0; index < partnerCount; index += 1) await assertPainted(partners.nth(index));
      await assertPainted(page.getByTestId('score-delta').last());
      const next = page.getByTestId('next-hand');
      await assertPainted(next);
      const dock = await page.getByTestId('hand-dock').boundingBox();
      const box = await next.boundingBox();
      if (!dock || !box) throw new Error('missing next hand');
      expect(box.y).toBeGreaterThanOrEqual(dock.y - 1);
    });
  }
});

async function scrollResult(page: Page, card: Locator, touch: boolean): Promise<void> {
  const anchor = page.getByTestId('your-result');
  const box = await anchor.boundingBox();
  if (!box) throw new Error('missing your result');
  const x = box.x + Math.min(box.width / 2, 80);
  const y = box.y + box.height / 2;
  for (let pass = 0; pass < 18; pass += 1) {
    if (await rowsFit(page, card)) break;
    await nudge(page, touch, x, y);
  }
}

async function rowsFit(page: Page, card: Locator): Promise<boolean> {
  const frame = await card.boundingBox();
  if (!frame) return false;
  const rows = page.locator('[data-testid="score-delta"]');
  const count = await rows.count();
  for (let index = 0; index < count; index += 1) {
    const box = await rows.nth(index).boundingBox();
    if (!box) return false;
    if (box.y < frame.y - 0.5 || box.y + box.height > frame.y + frame.height + 0.5) return false;
  }
  return count > 0;
}

async function nudge(page: Page, touch: boolean, x: number, y: number): Promise<void> {
  if (touch) {
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    for (let step = 1; step <= 3; step += 1) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 12, id: 1 }] });
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, 36);
  }
  await page.waitForTimeout(40);
}

async function assertPainted(locator: Locator): Promise<void> {
  const problems = await locator.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    const found: string[] = [];
    if (box.width < 1 || box.height < 1) found.push('no painted box');
    if (box.top < -0.5 || box.bottom > window.innerHeight + 0.5) found.push('outside');
    if (hit !== node && !(node instanceof Element && node.contains(hit))) found.push('covered');
    let parent = node.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      const clips = ['hidden', 'auto', 'scroll', 'clip'].includes(style.overflowY);
      if (clips) {
        const frame = parent.getBoundingClientRect();
        if (box.top < frame.top - 0.5 || box.bottom > frame.bottom + 0.5) {
          found.push('clipped');
          break;
        }
      }
      parent = parent.parentElement;
    }
    return found;
  });
  expect(problems, problems.join('; ')).toEqual([]);
}
