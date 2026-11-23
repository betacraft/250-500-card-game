import { expect, test } from '@playwright/test';
import { assertBidAtRest, assertChipInset, assertControlsClear, assertCueBoxes, assertGridClear, assertHandCorners, assertHandSize, assertReadableCopy, assertScoreChips } from './visible-hand';

const views = [
  { width: 1024, height: 572, shot: true },
  { width: 1280, height: 800, shot: false },
  { width: 1366, height: 768, shot: false },
  { width: 390, height: 844, shot: true },
  { width: 360, height: 740, shot: true },
] as const;

async function deal(page: import('@playwright/test').Page, variant: '250' | '500', width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/play');
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByTestId('start-vs-bots').click();
  await expect(page.getByTestId('hand-fan')).toBeVisible();
}

async function bidMax(page: import('@playwright/test').Page): Promise<void> {
  if (await page.getByTestId('declare-form').isVisible().catch(() => false)) return;
  for (let i = 0; i < 16; i += 1) {
    const add = page.getByRole('button', { name: 'Add 20 to the bid' });
    if (!(await add.isVisible().catch(() => false)) || (await add.isDisabled())) break;
    await add.click();
  }
  await page.getByRole('button', { name: /^Bid / }).click();
}

test.describe('hand stays readable', () => {
  test.describe.configure({ timeout: 90_000 });

  for (const variant of ['250', '500'] as const) {
    for (const view of views) {
      test(`${variant} at ${view.width}x${view.height}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));
        await deal(page, variant, view.width, view.height);
        const handSizes: number[] = [];
        handSizes.push(await assertHandSize(page));
        await page.getByRole('button', { name: 'Decrease bid by 5' }).tap({ force: true });
        await expect(page.getByTestId('disabled-reason')).toContainText(/lowest bid/i);
        await page.getByRole('button', { name: 'Increase bid by 5' }).click();
        await expect(page.getByTestId('disabled-reason')).toHaveCount(0);
        if (view.height <= 760) await assertBidAtRest(page);
        await assertHandCorners(page);
        await assertControlsClear(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await assertScoreChips(page);
        if (view.shot) await page.screenshot({ path: `/opt/cursor/artifacts/bid-${variant}-${view.width}x${view.height}.png`, fullPage: false });
        await page.getByRole('button', { name: /^Bid / }).click();
        const bidAgain = page.getByRole('button', { name: /^Bid / });
        await expect(bidAgain.or(page.getByTestId('declare-form'))).toBeVisible({ timeout: 20_000 });
        if (await bidAgain.isVisible()) {
          await page.evaluate(() => window.scrollTo(0, 0));
          if (view.height <= 760) await assertBidAtRest(page);
          if (view.width === 1024 && variant === '250') {
            await page.screenshot({ path: '/opt/cursor/artifacts/bid-round2-1024x572.png', fullPage: false });
          }
        }
        await bidMax(page);
        await expect(page.getByTestId('declare-form')).toBeVisible();
        handSizes.push(await assertHandSize(page));
        await expect(page.getByTestId('turn-marker')).toBeVisible();
        await expect(page.getByTestId('bidder-marker')).toBeVisible();
        await assertChipInset(page);
        if (view.height <= 760) await expect(page.getByTestId('held-legend')).toBeVisible();
        await assertCueBoxes(page);
        await assertReadableCopy(page);
        await assertGridClear(page, variant === '250' && (view.width === 360 || view.width === 1024));
        await page.getByRole('button', { name: 'Confirm declaration' }).tap({ force: true });
        await expect(page.getByTestId('disabled-reason')).toContainText(/trump/i);
        await assertHandCorners(page);
        await assertControlsClear(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await assertScoreChips(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
        expect(overflow).toBe(false);
        if (view.shot) await page.screenshot({ path: `/opt/cursor/artifacts/declare-${variant}-${view.width}x${view.height}.png`, fullPage: false });
        await page.getByRole('button', { name: 'Trump Spades' }).click();
        const need = variant === '250' ? 2 : 3;
        for (const rank of ['3', '4', '5'].slice(0, need)) {
          await page.getByTestId('declare-form').getByRole('button', { name: new RegExp(`^${rank} of clubs`) }).click();
        }
        await page.getByRole('button', { name: 'Confirm declaration' }).click();
        await expect(page.getByText('Your turn')).toBeVisible();
        handSizes.push(await assertHandSize(page));
        expect(new Set(handSizes).size, `hand widths ${handSizes.join(',')}`).toBe(1);
        if (view.width === 360 || view.width === 1024) expect(handSizes[0]).toBeGreaterThanOrEqual(80);
        await assertHandCorners(page);
        await assertControlsClear(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await assertScoreChips(page);
        await assertCueBoxes(page);
        await assertReadableCopy(page);
        if (view.shot) await page.screenshot({ path: `/opt/cursor/artifacts/play-${variant}-${view.width}x${view.height}.png`, fullPage: false });
        const played = await page.evaluate(() => {
          const buttons = [...document.querySelectorAll('[data-testid="hand-card"]')];
          const labelAt = (x: number, y: number): string => document.elementFromPoint(x, y)?.closest('[data-testid="hand-card"]')?.getAttribute('aria-label') ?? '';
          for (const button of buttons) {
            if (button.getAttribute('aria-disabled') === 'true') continue;
            const svg = button.querySelector('svg');
            if (!(svg instanceof SVGSVGElement)) continue;
            const ctm = svg.getScreenCTM();
            const spot = svg.createSVGPoint();
            spot.x = 48;
            spot.y = 70;
            const screen = ctm ? spot.matrixTransform(ctm) : spot;
            if (labelAt(screen.x, screen.y) === (button.getAttribute('aria-label') ?? '')) return { x: screen.x, y: screen.y };
          }
          return null;
        });
        if (!played) throw new Error('no exposed legal face');
        await page.mouse.click(played.x, played.y);
        await page.getByTestId('confirm-play').tap();
        await expect(page.getByText(/Bot \d+ to play/)).toBeVisible();
        const pauseShown = page.getByTestId('trick-pause').waitFor({ timeout: 20_000 });
        await assertCueBoxes(page);
        if (view.shot) await page.screenshot({ path: `/opt/cursor/artifacts/other-${variant}-${view.width}x${view.height}.png`, fullPage: false });
        await pauseShown;
        await expect(page.getByTestId('trick-winner')).toBeVisible();
        await expect(page.getByTestId('hand-complete')).toHaveCount(0);
        const trickWidth = Number(await page.getByTestId('trick-winner').getAttribute('data-card-width'));
        if (variant === '500' && (view.width === 360 || view.width === 390)) expect(trickWidth).toBeGreaterThanOrEqual(47);
        if (variant === '250') expect(trickWidth).toBeGreaterThanOrEqual(50);
        await assertCueBoxes(page);
        if (view.shot) await page.screenshot({ path: `/opt/cursor/artifacts/pause-${variant}-${view.width}x${view.height}.png`, fullPage: false });
        expect(errors, errors.join('\n')).toEqual([]);
      });
    }
  }

  test('every trick pauses on the winner, including the last', async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    for (const variant of ['250', '500'] as const) {
      await deal(page, variant, 360, 740);
      await bidMax(page);
      await page.getByRole('button', { name: 'Trump Spades' }).click();
      const need = variant === '250' ? 2 : 3;
      for (const rank of ['3', '4', '5'].slice(0, need)) {
        await page.getByTestId('declare-form').getByRole('button', { name: new RegExp(`^${rank} of clubs`) }).click();
      }
      await page.getByRole('button', { name: 'Confirm declaration' }).click();
      await page.evaluate(() => {
        const win = window as unknown as { __pauseMs?: number };
        let opened = 0;
        const note = (): void => {
          const on = Boolean(document.querySelector('[data-testid="trick-pause"]'));
          if (on && opened === 0) opened = Date.now();
          if (!on && opened > 0) {
            win.__pauseMs = Date.now() - opened;
            opened = 0;
          }
        };
        new MutationObserver(note).observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ['data-testid'] });
      });
      const target = variant === '250' ? 8 : 12;
      for (let trick = 0; trick < target; trick += 1) {
        const pause = page.getByTestId('trick-pause');
        const deadline = Date.now() + 20_000;
        while (!(await pause.isVisible()) && Date.now() < deadline) {
          if (await page.getByText('Your turn').isVisible()) {
            await playHumanCard(page);
            await expect(page.getByText('Your turn')).toBeHidden({ timeout: 2_000 });
          }
          await page.waitForTimeout(80);
        }
        await expect(pause).toBeVisible();
        await expect(page.getByTestId('trick-winner')).toBeVisible();
        await expect(page.getByTestId('hand-complete')).toHaveCount(0);
        await expect(pause).toBeHidden({ timeout: 5_000 });
        const held = await page.evaluate(() => (window as unknown as { __pauseMs?: number }).__pauseMs ?? 0);
        expect(held).toBeGreaterThanOrEqual(1100);
      }
      await expect(page.getByTestId('hand-complete')).toBeVisible();
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

async function playHumanCard(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const bridge = (window as unknown as { __localPlay?: { getState: () => { hand: { hands: Record<string, { rank: string; suit: string }[]> }; play: (card: { rank: string; suit: string }) => void } } }).__localPlay;
    const api = bridge?.getState();
    const label = document.querySelector('[data-testid="hand-card"][aria-disabled="false"]')?.getAttribute('aria-label') ?? '';
    const [rank, , suit] = label.replace(', in your hand', '').split(' ');
    const held = api?.hand.hands.p1 ?? [];
    const card = held.find((item) => item.rank === rank && item.suit === suit);
    if (!api || !card) throw new Error(`no card to play (${label})`);
    api.play(card);
  });
}
