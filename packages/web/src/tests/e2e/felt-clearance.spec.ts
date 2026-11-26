import { expect, test, type Page } from '@playwright/test';
import { saveShot } from './visible-hand';

const cases = [
  { game: '250' as const, width: 320, height: 568, min: 5, shot: 'r25-320x568-lift-250.png', seeds: [3, 34, 38, 45] },
  { game: '500' as const, width: 320, height: 568, min: 7, shot: 'r25-320x568-lift-500.png', seeds: [58, 61, 62, 90] },
  { game: '250' as const, width: 360, height: 740, min: 5, shot: null, seeds: [3, 34, 38, 45] },
  { game: '500' as const, width: 360, height: 740, min: 7, shot: null, seeds: [58, 61, 62, 90] },
];

test.describe('the felt keeps every seat label', () => {
  test.describe.configure({ timeout: 120_000 });

  for (const item of cases) {
    test(`${item.game} at ${item.width}x${item.height} with ${item.min} cards`, async ({ page }) => {
      await page.setViewportSize({ width: item.width, height: item.height });
      let found = false;
      for (const seed of item.seeds) {
        await page.clock.setFixedTime(new Date(1795600000000 + seed - 1));
        await page.goto('/play');
        await page.getByRole('button', { name: new RegExp(`^${item.game}`) }).click();
        await page.getByLabel('Your name').fill('Ada');
        const autoPlay = page.getByTestId('autoplay-toggle');
        if ((await autoPlay.getAttribute('aria-pressed')) === 'true') await autoPlay.click();
        await page.getByTestId('start-vs-bots').click();
        found = await reachDense(page, item.min, item.game === '500' ? 3 : 2);
        if (found) break;
      }
      expect(found).toBe(true);
      await liftOne(page);
      await expectFelt(page, item.min);
      await expectLifted(page);
      if (item.shot) await saveShot(page, `/opt/cursor/artifacts/${item.shot}`, false);
    });
  }
});

async function reachDense(page: Page, minTrick: number, partners: number): Promise<boolean> {
  for (let step = 0; step < 900; step += 1) {
    const ready = await page.evaluate(() => {
      const yours = (document.querySelector('[data-testid="play-status"]')?.textContent ?? '').includes('Your turn');
      const finish = Boolean(document.querySelector('[data-testid="finish-hand"]'));
      const trick = document.querySelectorAll('[data-testid="trick-card"], [data-testid="trick-winner"]').length;
      const cards = document.querySelectorAll('[data-testid="hand-card"]').length;
      return { yours, finish, trick, cards };
    });
    if (ready.finish && ready.yours && ready.trick >= minTrick && ready.cards >= 1) return true;
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) return false;
    if (await act(page, partners)) continue;
    await page.clock.runFor(100);
  }
  return false;
}

async function act(page: Page, partners: number): Promise<boolean> {
  const pause = page.getByTestId('trick-pause');
  if (await pause.isVisible().catch(() => false)) {
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
    for (const label of labels.slice(0, partners)) await page.locator(`[data-testid="declare-form"] button[aria-label="${label}"]`).click({ force: true });
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
  if (!(await page.locator('[data-testid="hand-card"][data-selected="true"]').isVisible().catch(() => false))) return false;
  await page.getByTestId('confirm-play').dispatchEvent('pointerdown');
  return true;
}

async function liftOne(page: Page): Promise<void> {
  const picked = await page.evaluate(() => {
    const button = [...document.querySelectorAll('[data-testid="hand-card"]')].find((node) => node.getAttribute('aria-disabled') !== 'true');
    if (!(button instanceof HTMLElement)) return false;
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    return true;
  });
  expect(picked).toBe(true);
  await expect(page.locator('[data-testid="hand-card"][data-selected="true"]')).toBeVisible();
}

async function expectFelt(page: Page, minCards: number): Promise<void> {
  const problems = await page.evaluate((min) => {
    const felt = document.querySelector('[data-testid="trick-area"]');
    if (!(felt instanceof HTMLElement)) return ['missing felt'];
    const found: string[] = [];
    if (felt.scrollHeight > felt.clientHeight + 1) found.push(`felt scrolls ${felt.scrollHeight}>${felt.clientHeight}`);
    const box = felt.getBoundingClientRect();
    if (box.top < -1 || box.left < -1 || box.bottom > window.innerHeight + 1 || box.right > window.innerWidth + 1) found.push('felt off screen');
    const seats = [...felt.querySelectorAll('[data-testid="trick-seat"]')];
    if (seats.length < min) found.push(`seats ${seats.length}`);
    for (const seat of seats) {
      const mark = seat.getBoundingClientRect();
      const inside = mark.top >= box.top - 1 && mark.bottom <= box.bottom + 1 && mark.left >= box.left - 1 && mark.right <= box.right + 1;
      const onScreen = mark.top >= -1 && mark.left >= -1 && mark.bottom <= window.innerHeight + 1 && mark.right <= window.innerWidth + 1;
      if (mark.height < 8 || !inside || !onScreen) found.push('seat clipped');
    }
    return found;
  }, minCards);
  expect(problems).toEqual([]);
}

test.describe('landscape felt stays whole', () => {
  test.describe.configure({ timeout: 180_000 });

  for (const item of [
    { game: '250' as const, min: 5, seeds: [3, 34, 38, 45], shot: 'r26-667x375-250.png' },
    { game: '500' as const, min: 7, seeds: [58, 61, 62, 90], shot: 'r26-667x375-500' },
  ]) {
    test(`${item.game} at 667x375 through banner, play, and the summary`, async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 });
      let found = false;
      for (const seed of item.seeds) {
        await page.clock.setFixedTime(new Date(1795600000000 + seed - 1));
        await page.goto('/play');
        await page.getByRole('button', { name: new RegExp(`^${item.game}`) }).click();
        await page.getByLabel('Your name').fill('Ada');
        const autoPlay = page.getByTestId('autoplay-toggle');
        if ((await autoPlay.getAttribute('aria-pressed')) === 'true') await autoPlay.click();
        await page.getByTestId('start-vs-bots').click();
        found = await reachPhase(page, item.min, item.game === '500' ? 3 : 2, 'banner');
        if (found) break;
      }
      expect(found).toBe(true);
      await expectFelt(page, item.min);
      const bannerShot = item.game === '500' ? 'r26-667x375-500-banner.png' : item.shot;
      if (bannerShot) await saveShot(page, `/opt/cursor/artifacts/${bannerShot}`, false);
      found = await reachPhase(page, item.min, item.game === '500' ? 3 : 2, 'play');
      expect(found).toBe(true);
      await expect(page.getByTestId('confirm-play')).toBeVisible();
      await expect(page.getByTestId('bid-lock-banner')).toHaveCount(0);
      await expectFelt(page, item.min);
      if (item.game === '500') await saveShot(page, '/opt/cursor/artifacts/r26-667x375-500-afterbanner.png', false);
      await page.getByTestId('summary-line').click();
      await expect(page.getByTestId('summary-detail')).toBeVisible();
      await expectFelt(page, item.min);
      if (item.game === '500') await saveShot(page, '/opt/cursor/artifacts/r26-667x375-500-summary-open.png', false);
    });
  }
});

test('the partner toast stays off the trick cards', async ({ page }) => {
  for (const view of [
    { width: 320, height: 568, shot: 'r26-320x568-toast.png' },
    { width: 360, height: 740, shot: null },
    { width: 390, height: 844, shot: null },
    { width: 667, height: 375, shot: null },
  ]) {
    await page.clock.setFixedTime(new Date(1795600000014));
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.goto('/play?script=reveal');
    await page.getByRole('button', { name: /^250/ }).click();
    await page.getByLabel('Your name').fill('Ada');
    await page.getByTestId('start-vs-bots').click();
    const pill = page.getByTestId('partner-toast-pill');
    await expect(pill).toBeVisible();
    const hit = await page.evaluate(() => {
      const toast = document.querySelector('[data-testid="partner-toast-pill"]')?.getBoundingClientRect();
      if (!toast) return ['missing toast'];
      const cards = [...document.querySelectorAll('[data-testid="trick-card"], [data-testid="trick-winner"]')];
      return cards.filter((card) => {
        const box = card.getBoundingClientRect();
        return toast.left < box.right && toast.right > box.left && toast.top < box.bottom && toast.bottom > box.top;
      }).map(() => 'toast covers a trick card');
    });
    expect(hit).toEqual([]);
    if (view.shot) await saveShot(page, `/opt/cursor/artifacts/${view.shot}`, false);
  }
});

async function reachPhase(page: Page, minTrick: number, partners: number, phase: 'banner' | 'play'): Promise<boolean> {
  for (let step = 0; step < 900; step += 1) {
    const ready = await page.evaluate(() => {
      const yours = (document.querySelector('[data-testid="play-status"]')?.textContent ?? '').includes('Your turn');
      const finish = Boolean(document.querySelector('[data-testid="finish-hand"]'));
      const banner = Boolean(document.querySelector('[data-testid="bid-lock-banner"]'));
      const play = Boolean(document.querySelector('[data-testid="confirm-play"]'));
      const trick = document.querySelectorAll('[data-testid="trick-card"], [data-testid="trick-winner"]').length;
      return { yours, finish, banner, play, trick };
    });
    const bannerHit = phase === 'banner' && ready.finish && ready.banner && ready.trick >= minTrick;
    const playHit = phase === 'play' && ready.finish && !ready.banner && ready.yours && ready.play && ready.trick >= minTrick;
    if (bannerHit || playHit) return true;
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) return false;
    if (phase === 'banner' && ready.finish && ready.banner && ready.trick >= minTrick) return true;
    if (await act(page, partners)) continue;
    await page.clock.runFor(100);
  }
  return false;
}

async function expectLifted(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const selected = document.querySelector('[data-testid="hand-card"][data-selected="true"] [data-testid="card-lift"]');
    const fan = document.querySelector('[data-testid="hand-fan"]')?.getBoundingClientRect();
    const finish = document.querySelector('[data-testid="finish-hand"]')?.getBoundingClientRect();
    if (!(selected instanceof HTMLElement) || !fan || !finish) return ['missing lift'];
    const box = selected.getBoundingClientRect();
    const inside = box.top >= fan.top - 1 && box.bottom <= fan.bottom + 1 && box.top >= -1 && box.bottom <= window.innerHeight + 1;
    const overlaps = box.left < finish.right && box.right > finish.left && box.top < finish.bottom && box.bottom > finish.top;
    const found: string[] = [];
    if (box.height < 40 || !inside) found.push('lifted card clipped');
    if (overlaps) found.push('lifted card covers Finish');
    return found;
  });
  expect(problems).toEqual([]);
}
