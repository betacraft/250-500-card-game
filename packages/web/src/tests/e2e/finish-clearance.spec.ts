import { expect, test, type Page } from '@playwright/test';
import { saveShot } from './visible-hand';

/** Easy deal whose lock lands while the human still holds cards. */
const SEED_TIME = new Date(1795600000014);

const views = [
  { width: 320, height: 568, shot: null, banner: false },
  { width: 360, height: 740, shot: 'finish-dock-360x740-realhand-v2.png', banner: false },
  { width: 390, height: 844, shot: 'finish-dock-390x844-recap-banner-v2.png', banner: true },
  { width: 667, height: 375, shot: 'finish-dock-667x375-realhand-v2.png', banner: false },
  { width: 1366, height: 768, shot: null, banner: false },
] as const;

test.describe('finish sits in the dock on a real hand', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const view of views) {
    test(`clears the fan and the trick at ${view.width}x${view.height}`, async ({ page }) => {
      await page.clock.setFixedTime(SEED_TIME);
      await page.setViewportSize({ width: view.width, height: view.height });
      await page.goto('/play');
      await page.getByRole('button', { name: /^250/ }).click();
      await page.getByLabel('Your name').fill('Ada');
      const autoPlay = page.getByTestId('autoplay-toggle');
      if ((await autoPlay.getAttribute('aria-pressed')) === 'true') await autoPlay.click();
      await page.getByTestId('start-vs-bots').click();
      await reachLock(page, view.banner);
      await expectTrickFaces(page);
      await expectFanFaces(page);
      if (view.banner) {
        await expect(page.getByTestId('auction-recap')).toBeVisible();
        await expect(page.getByTestId('bid-lock-banner')).toBeVisible();
      }
      if (view.height === 375) {
        await expectHeaderClear(page);
        await expectNoScroll(page);
      }
      const cards = await page.getByTestId('hand-card').count();
      expect(cards).toBeGreaterThanOrEqual(1);
      if (view.shot) await saveShot(page, `/opt/cursor/artifacts/${view.shot}`, false);
      await expectDocked(page);
      await tapFinish(page);
    });
  }
});

async function reachLock(page: Page, wantBanner: boolean): Promise<void> {
  for (let step = 0; step < 700; step += 1) {
    const ready = await page.evaluate(() => {
      const finish = document.querySelector('[data-testid="finish-hand"]');
      const cards = document.querySelectorAll('[data-testid="hand-card"]').length;
      const banner = Boolean(document.querySelector('[data-testid="bid-lock-banner"]'));
      const trick = document.querySelectorAll('[data-testid="trick-card"], [data-testid="trick-winner"]').length;
      const recap = Boolean(document.querySelector('[data-testid="auction-recap"]'));
      return { finish: Boolean(finish), cards, banner, trick, recap };
    });
    if (ready.finish && ready.cards >= 1 && ready.trick >= 6 && (!wantBanner || (ready.banner && ready.recap))) return;
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) break;
    if (await act(page)) continue;
    const heldTrick = await page.getByTestId('trick-pause').isVisible().catch(() => false)
      && await page.getByTestId('finish-hand').isVisible().catch(() => false)
      && await page.locator('[data-testid="trick-card"], [data-testid="trick-winner"]').count() >= 6
      && await page.getByTestId('hand-card').count() >= 1;
    if (!heldTrick) await page.clock.runFor(100);
  }
  throw new Error('the dealt hand never latched a lock with cards still in hand');
}

async function act(page: Page): Promise<boolean> {
  const pause = page.getByTestId('trick-pause');
  if (await pause.isVisible().catch(() => false)) {
    const dealt = await page.locator('[data-testid="trick-card"], [data-testid="trick-winner"]').count();
    const held = await page.getByTestId('hand-card').count();
    const finish = await page.getByTestId('finish-hand').isVisible().catch(() => false);
    if (dealt >= 6 && held >= 1 && finish) return false;
    await pause.click({ force: true }).catch(() => undefined);
    return true;
  }
  const pass = page.getByRole('button', { name: 'Pass' });
  if (await pass.isVisible().catch(() => false)) {
    await pass.click({ force: true });
    return true;
  }
  const declare = page.getByTestId('declare-form');
  if (await declare.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Trump: Hearts' }).click({ force: true });
    const labels = await page.locator('[data-testid="declare-form"] button[aria-label*=" of "]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('aria-label') ?? '').filter((label) => label.length > 0 && !label.includes('in your hand')),
    );
    for (const label of labels.slice(0, 2)) await page.locator(`[data-testid="declare-form"] button[aria-label="${label}"]`).click({ force: true });
    await page.getByRole('button', { name: 'Confirm declaration' }).click({ force: true });
    return true;
  }
  const yours = await page.getByText('Your turn').isVisible().catch(() => false);
  if (!yours) return false;
  const picked = await page.evaluate(() => {
    const button = [...document.querySelectorAll('[data-testid="hand-card"]')].find((node) => node.getAttribute('aria-disabled') !== 'true');
    if (!(button instanceof HTMLElement)) return false;
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    return true;
  });
  if (!picked) return false;
  const selected = page.locator('[data-testid="hand-card"][data-selected="true"]');
  if (!(await selected.isVisible().catch(() => false))) return false;
  await page.getByTestId('confirm-play').dispatchEvent('pointerdown');
  return true;
}

async function expectDocked(page: Page): Promise<void> {
  const report = await page.evaluate(() => {
    const rect = (node: Element | null) => {
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
    };
    const finish = document.querySelector('[data-testid="finish-hand"]');
    const scroller = document.querySelector('[data-testid="play-scroll"]');
    const scrolling = scroller?.querySelector('.overflow-y-auto');
    const status = document.querySelector('[data-testid="play-status"]') ?? document.querySelector('[data-testid="trick-status"]');
    const cards = [...document.querySelectorAll('[data-testid="hand-dock"] [data-testid="hand-card"]')].map((node) => rect(node));
    return {
      finish: rect(finish),
      fan: rect(document.querySelector('[data-testid="hand-fan"]')),
      trick: rect(document.querySelector('[data-testid="trick-area"]')),
      status: rect(status),
      cards,
      dock: rect(document.querySelector('[data-testid="hand-dock"]')),
      pane: rect(scroller),
      inDock: Boolean(finish?.closest('[data-testid="hand-dock"]')),
      scroll: window.scrollY + (scroller?.scrollTop ?? 0) + (scrolling?.scrollTop ?? 0),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
  expect(report.inDock).toBe(true);
  expect(report.scroll).toBe(0);
  expect(report.finish).not.toBeNull();
  expect(report.fan).not.toBeNull();
  expect(report.trick).not.toBeNull();
  expect(report.status).not.toBeNull();
  if (!report.finish || !report.viewport) return;
  expect(report.finish.top).toBeGreaterThanOrEqual(0);
  expect(report.finish.left).toBeGreaterThanOrEqual(0);
  expect(report.finish.right).toBeLessThanOrEqual(report.viewport.width);
  expect(report.finish.bottom).toBeLessThanOrEqual(report.viewport.height);
  expect(report.finish.height).toBeGreaterThanOrEqual(44);
  if (report.fan) expect(overlaps(report.finish, report.fan)).toBe(false);
  if (report.trick) expect(overlaps(report.finish, report.trick)).toBe(false);
  if (report.status) expect(overlaps(report.finish, report.status)).toBe(false);
  for (const card of report.cards) {
    if (card) expect(overlaps(report.finish, card)).toBe(false);
  }
  const centre = { x: (report.finish.left + report.finish.right) / 2, y: (report.finish.top + report.finish.bottom) / 2 };
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-testid="finish-hand"]') != null, centre);
  expect(hit).toBe(true);
}

async function expectTrickFaces(page: Page): Promise<void> {
  const hidden = await page.evaluate(() => {
    const felt = document.querySelector('[data-testid="trick-area"]')?.getBoundingClientRect();
    if (!felt) return ['missing felt'];
    const inside = (box: DOMRect, outer: DOMRect): boolean => box.top >= outer.top - 1 && box.bottom <= outer.bottom + 1 && box.left >= outer.left - 1 && box.right <= outer.right + 1;
    const onScreen = (box: DOMRect): boolean => box.top >= -1 && box.left >= -1 && box.bottom <= window.innerHeight + 1 && box.right <= window.innerWidth + 1;
    const problems: string[] = [];
    const cards = [...document.querySelectorAll('[data-testid="trick-card"], [data-testid="trick-winner"]')];
    if (cards.length < 6) problems.push(`trick has ${cards.length} cards`);
    for (const card of cards) {
      const box = card.getBoundingClientRect();
      if (box.height < 40 || !inside(box, felt) || !onScreen(box)) problems.push('card clipped');
    }
    for (const seat of document.querySelectorAll('[data-testid="trick-seat"]')) {
      const box = seat.getBoundingClientRect();
      if (box.height < 8 || !inside(box, felt) || !onScreen(box)) problems.push('seat label clipped');
    }
    return problems;
  });
  expect(hidden).toEqual([]);
}

async function expectFanFaces(page: Page): Promise<void> {
  const hidden = await page.evaluate(() => {
    const fan = document.querySelector('[data-testid="hand-fan"]')?.getBoundingClientRect();
    if (!fan) return ['missing fan'];
    const problems: string[] = [];
    if (fan.top < -1 || fan.bottom > window.innerHeight + 1) problems.push('fan off screen');
    for (const card of document.querySelectorAll('[data-testid="hand-card"]')) {
      const box = card.getBoundingClientRect();
      const top = Math.max(box.top, fan.top, 0);
      const bottom = Math.min(box.bottom, fan.bottom, window.innerHeight);
      if (bottom - top < box.height - 4 || box.left < -1 || box.right > window.innerWidth + 1) problems.push('fan card clipped');
    }
    return problems;
  });
  expect(hidden).toEqual([]);
}

async function expectNoScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => [...document.querySelectorAll('[data-testid="play-scroll"] .overflow-y-auto')].some((node) => node.scrollHeight > node.clientHeight + 1));
  expect(overflow).toBe(false);
}

async function expectHeaderClear(page: Page): Promise<void> {
  const clear = await page.evaluate(() => {
    const head = document.querySelector('[data-testid="led-suit"]') ?? document.querySelector('[data-testid="trick-leader"]');
    const area = document.querySelector('[data-testid="trick-area"]');
    if (!(head instanceof HTMLElement) || !area) return false;
    const box = head.getBoundingClientRect();
    const felt = area.getBoundingClientRect();
    return box.height > 8 && box.top >= felt.top - 1 && box.bottom <= felt.bottom + 1 && box.top >= 0 && box.bottom <= window.innerHeight && head.scrollWidth <= head.clientWidth + 1;
  });
  expect(clear).toBe(true);
}

async function tapFinish(page: Page): Promise<void> {
  const before = await page.getByTestId('hand-card').count();
  const box = await page.getByTestId('finish-hand').boundingBox();
  if (!box) throw new Error('Finish has no box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  let moved = false;
  for (let step = 0; step < 40; step += 1) {
    const cards = await page.getByTestId('hand-card').count();
    const done = await page.getByTestId('hand-complete').isVisible().catch(() => false);
    if (done || cards < before) {
      moved = true;
      break;
    }
    await page.clock.runFor(150);
  }
  expect(moved).toBe(true);
}

function overlaps(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
