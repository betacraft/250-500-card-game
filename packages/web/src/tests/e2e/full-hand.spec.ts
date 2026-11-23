import { expect, test, type Locator, type Page } from '@playwright/test';
import { assertBidAtRest, assertChipInset, assertChipRings, assertCueBoxes, assertHandCorners, assertHandSize, assertReadableCopy } from './visible-hand';

const views = [
  { width: 1024, height: 572 },
  { width: 1280, height: 800 },
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
  { width: 360, height: 740 },
] as const;

const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
const suits = ['spades', 'hearts', 'diamonds', 'clubs'] as const;

test.describe('full hands from the real controls', () => {
  test.describe.configure({ timeout: 240_000 });

  for (const variant of ['250', '500'] as const) {
    for (const view of views) {
      test(`${variant} at ${view.width}x${view.height}`, async ({ page }) => {
        test.setTimeout(240_000);
        const input = variant === '250' ? 'mouse' : 'touch';
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));

        await deal(page, variant, view, input);
        await loseAuction(page, input);
        const lostWidths: number[] = [];
        await finishHand(page, input, true, lostWidths);
        await expect(page.getByTestId('hand-complete')).toBeVisible();
        await expect(page.getByTestId('turn-marker')).toHaveCount(0);

        const sizes: number[] = [];
        let rounds = 0;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          await deal(page, variant, view, input);
          sizes.splice(0, sizes.length, await assertHandSize(page));
          rounds = await winAuction(page, input, variant === '250' && isRound2View(view), view);
          if (rounds >= 2 || !isRound2View(view)) break;
        }
        if (isRound2View(view)) expect(rounds).toBeGreaterThanOrEqual(2);
        await expect(page.getByTestId('declare-form')).toBeVisible();
        sizes.push(await assertHandSize(page));
        await page.evaluate(() => {
          window.scrollTo(0, 0);
          const scroller = document.querySelector('[data-testid="play-scroll"]');
          if (scroller instanceof HTMLElement) scroller.scrollTop = 0;
        });
        await assertHandCorners(page);
        await assertChipRings(page);
        await assertChipInset(page);
        await assertCueBoxes(page);
        await assertReadableCopy(page);
        if (variant === '500' && view.width === 360) {
          await page.screenshot({ path: '/opt/cursor/artifacts/chips-500-360x740.png', fullPage: false });
        }
        await declare(page, input, variant, view);
        await expect(page.getByText('Your turn')).toBeVisible();
        sizes.push(await assertHandSize(page));
        expect(new Set(sizes).size, `hand widths ${sizes.join(',')}`).toBe(1);
        if (view.width === 360 || view.width === 1024) expect(sizes[0]).toBeGreaterThanOrEqual(80);
        await assertHandCorners(page);
        await assertFaceCentres(page);
        const wonWidths: number[] = [];
        await finishHand(page, input, false, wonWidths);
        await expect(page.getByTestId('hand-complete')).toBeVisible();
        await expect(page.getByTestId('turn-marker')).toHaveCount(0);
        expect(wonWidths.length).toBeGreaterThan(0);
        const trickWidth = Math.min(...wonWidths);
        if (variant === '500' && (view.width === 360 || view.width === 390)) expect(trickWidth).toBeGreaterThanOrEqual(47);
        if (variant === '250') expect(trickWidth).toBeGreaterThanOrEqual(50);
        expect(errors, errors.join('\n')).toEqual([]);
      });
    }
  }
});

function isRound2View(view: { width: number; height: number }): boolean {
  return (view.width === 1280 && view.height === 800) || (view.width === 1366 && view.height === 768) || (view.width === 390 && view.height === 844);
}

async function deal(page: Page, variant: '250' | '500', view: { width: number; height: number }, input: 'mouse' | 'touch'): Promise<void> {
  await page.setViewportSize({ width: view.width, height: view.height });
  await page.goto('/play');
  await clickCentre(page, page.getByRole('button', { name: new RegExp(`^${variant}`) }), input, true);
  await clickCentre(page, page.getByLabel('Your name'), input, true);
  await page.keyboard.type('Ada');
  await clickCentre(page, page.getByTestId('start-vs-bots'), input, true);
  await page.getByTestId('hand-fan').waitFor();
}

async function loseAuction(page: Page, input: 'mouse' | 'touch'): Promise<void> {
  await page.evaluate(resetScroll);
  await assertBidAtRest(page);
  await clickCentre(page, page.getByRole('button', { name: 'Pass' }), input, true);
  await expect(page.getByText(/is declaring|Your turn/)).toBeVisible({ timeout: 20_000 });
}

async function winAuction(page: Page, input: 'mouse' | 'touch', shot: boolean, view: { width: number; height: number }): Promise<number> {
  let turns = 0;
  for (let guard = 0; guard < 16; guard += 1) {
    const bid = page.getByRole('button', { name: /^Bid / });
    await expect(bid.or(page.getByTestId('declare-form'))).toBeVisible({ timeout: 20_000 });
    if (await page.getByTestId('declare-form').isVisible()) return turns;
    turns += 1;
    await page.evaluate(resetScroll);
    await assertBidAtRest(page);
    if (turns === 1) {
      await exerciseSteppers(page, input);
      await releaseToMinimum(page, input);
      await clickCentre(page, bid, input, true);
      continue;
    }
    if (shot && turns === 2) {
      await page.screenshot({ path: `/opt/cursor/artifacts/bid-round2-${view.width}x${view.height}.png`, fullPage: false });
    }
    await raiseToMax(page, input);
    await clickCentre(page, page.getByRole('button', { name: /^Bid / }), input, true);
  }
  throw new Error('auction did not reach declaration');
}

async function exerciseSteppers(page: Page, input: 'mouse' | 'touch'): Promise<void> {
  const before = await controlBoxes(page);
  await clickCentre(page, page.getByRole('button', { name: 'Decrease bid by 5' }), input, true);
  await expect(page.getByTestId('disabled-reason')).toContainText(/lowest bid/i);
  expect(await controlBoxes(page)).toBe(before);
  await clickCentre(page, page.getByRole('button', { name: 'Increase bid by 5' }), input, true);
  await expect(page.getByTestId('disabled-reason')).toHaveText('');
  expect(await controlBoxes(page)).toBe(before);
  for (const step of [5, 10, 20]) {
    await clickCentre(page, page.getByRole('button', { name: `Add ${step} to the bid` }), input, true);
  }
}

async function releaseToMinimum(page: Page, input: 'mouse' | 'touch'): Promise<void> {
  for (let i = 0; i < 12; i += 1) {
    const down = page.getByRole('button', { name: 'Decrease bid by 5' });
    if ((await down.getAttribute('aria-disabled')) === 'true') return;
    await clickCentre(page, down, input, true);
  }
}

async function raiseToMax(page: Page, input: 'mouse' | 'touch'): Promise<void> {
  for (let i = 0; i < 20; i += 1) {
    const add = page.getByRole('button', { name: 'Add 20 to the bid' });
    if ((await add.getAttribute('aria-disabled')) === 'true') return;
    await clickCentre(page, add, input, true);
  }
}

async function declare(page: Page, input: 'mouse' | 'touch', variant: '250' | '500', view: { width: number; height: number }): Promise<void> {
  await clickCentre(page, page.getByRole('button', { name: 'Confirm declaration' }), input, true);
  await expect(page.getByTestId('disabled-reason')).toContainText(/trump/i);
  for (const suit of ['Hearts', 'Diamonds', 'Clubs', 'Spades']) {
    await clickCentre(page, page.getByRole('button', { name: `Trump ${suit}` }), input, false);
  }
  for (const suit of suits) {
    for (const rank of ranks) {
      await clickCentre(page, page.locator(`[data-testid="declare-form"] button[aria-label^="${rank} of ${suit}"]`), input, false);
    }
  }
  if (view.width === 390 && view.height === 844) {
    await page.locator('[data-testid="declare-form"] button[aria-label^="A of clubs"]').evaluate(reveal);
    await page.screenshot({ path: `/opt/cursor/artifacts/declare-${variant}-390x844.png`, fullPage: false });
  }
  await clickCentre(page, page.getByRole('button', { name: 'Confirm declaration' }), input, true);
}

async function finishHand(page: Page, input: 'mouse' | 'touch', holdScores: boolean, widths: number[]): Promise<void> {
  for (let guard = 0; guard < 500; guard += 1) {
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) return;
    if (await page.getByTestId('trick-pause').isVisible().catch(() => false)) {
      if (holdScores && (await page.locator('[data-testid="hand-card"]').count()) === 0) {
        const scores = await page.locator('[data-testid="score-chip-score"]').allTextContents();
        expect(scores.every((score) => score.trim() === '0')).toBe(true);
      }
      const width = await page.getByTestId('trick-winner').getAttribute('data-card-width');
      if (width) widths.push(Number(width));
      await expect(page.getByText(/won the trick · tap to skip/)).toBeVisible();
      await assertTableFacts(page);
      await clickCentre(page, page.getByTestId('trick-pause'), input, false);
      continue;
    }
    if (await page.getByText('Your turn').isVisible().catch(() => false)) {
      await assertFaceCentres(page);
      await assertTableFacts(page);
      const legal = page.locator('[data-testid="hand-card"][aria-disabled="false"]').first();
      await clickCentre(page, legal, input, true);
      await expect(page.getByTestId('confirm-play')).toBeVisible({ timeout: 1_500 });
      await clickCentre(page, page.getByTestId('confirm-play'), input, true);
      await expect(page.getByText('Your turn')).toBeHidden({ timeout: 2_000 });
      continue;
    }
    await page.waitForTimeout(40);
  }
  throw new Error('hand did not finish');
}

async function assertFaceCentres(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const found: string[] = [];
    document.querySelectorAll('[data-testid="hand-card"]').forEach((card) => {
      const box = card.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      const label = card.getAttribute('aria-label') ?? 'card';
      if (hit !== card && !(hit && card.contains(hit))) {
        const other = hit?.closest('[data-testid="hand-card"]')?.getAttribute('aria-label') ?? 'nothing';
        found.push(`${label} centre hit ${other}`);
      }
    });
    return found;
  });
  expect(problems, problems.join('\n')).toEqual([]);
}

async function clickCentre(page: Page, locator: Locator, input: 'mouse' | 'touch', pinned: boolean): Promise<void> {
  await locator.first().waitFor({ state: 'visible' });
  const point = await locator.first().evaluate(readCentre, pinned);
  expect(point.ok, point.detail).toBe(true);
  if (input === 'touch') await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

async function controlBoxes(page: Page): Promise<string> {
  return page.evaluate(() => {
    const nodes = [
      document.querySelector('[data-testid="hand-fan"]'),
      document.querySelector('[data-testid="confirm-play"]'),
      ...[...document.querySelectorAll('button')].filter((button) => /^(Bid |Pass$)/.test((button.textContent ?? '').trim()) || button.getAttribute('aria-label') === 'Increase bid by 5'),
    ];
    return nodes.map((node) => {
      const box = node?.getBoundingClientRect();
      if (!box) return 'missing';
      return [box.x, box.y, box.width, box.height].map((value) => value.toFixed(1)).join(',');
    }).join('|');
  });
}

async function assertTableFacts(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const found: string[] = [];
    const led = document.querySelector('[data-testid="led-suit"]')?.getAttribute('data-suit');
    const first = document.querySelector('[data-testid="trick-row"] [data-suit]')?.getAttribute('data-suit');
    if (first && led !== first) found.push(`led ${led ?? 'none'} but the first card is ${first}`);
    const trump = document.querySelector('[data-testid="trump-name"]')?.getAttribute('data-suit');
    const recap = document.querySelector('[data-testid="auction-recap"]')?.getAttribute('data-trump');
    if (trump && recap && trump !== recap) found.push(`trump line ${trump} but the recap says ${recap}`);
    return found;
  });
  expect(problems, problems.join('\n')).toEqual([]);
}

function resetScroll(): void {
  window.scrollTo(0, 0);
  const scroller = document.querySelector('[data-testid="play-scroll"]');
  if (scroller instanceof HTMLElement) scroller.scrollTop = 0;
}

function reveal(node: Element): void {
  const scroller = document.querySelector('[data-testid="play-scroll"]');
  if (!(scroller instanceof HTMLElement) || !scroller.contains(node)) return;
  for (let i = 0; i < 4; i += 1) {
    const frame = scroller.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    if (box.top < frame.top + 1) scroller.scrollTop -= frame.top - box.top + 6;
    else if (box.bottom > frame.bottom - 1) scroller.scrollTop += box.bottom - frame.bottom + 6;
    else break;
  }
}

function readCentre(node: Element, pinned: boolean): { x: number; y: number; ok: boolean; detail: string } {
  const scroller = document.querySelector('[data-testid="play-scroll"]');
  if (!pinned && scroller instanceof HTMLElement && scroller.contains(node)) {
    for (let i = 0; i < 4; i += 1) {
      const frame = scroller.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      if (box.top < frame.top + 1) scroller.scrollTop -= frame.top - box.top + 6;
      else if (box.bottom > frame.bottom - 1) scroller.scrollTop += box.bottom - frame.bottom + 6;
      else break;
    }
  }
  const box = node.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const hit = document.elementFromPoint(x, y);
  const label = node.getAttribute('aria-label') ?? (node.textContent ?? '').trim().slice(0, 40);
  const dock = document.querySelector('[data-testid="hand-dock"]');
  const inDock = dock?.contains(node) ?? false;
  if (!inDock && dock && y >= dock.getBoundingClientRect().top - 0.5) {
    return { x, y, ok: false, detail: `${label} centre is under the dock` };
  }
  const ok = hit === node || (!!hit && node.contains(hit));
  const other = hit?.closest('button')?.getAttribute('aria-label') ?? hit?.textContent?.trim().slice(0, 40) ?? 'nothing';
  return { x, y, ok, detail: ok ? label : `${label} centre hit ${other}` };
}

test('the latest card tap is the one that is played', async ({ page }) => {
  test.setTimeout(90_000);
  await deal(page, '250', { width: 1024, height: 572 }, 'mouse');
  await raiseToMax(page, 'mouse');
  await clickCentre(page, page.getByRole('button', { name: /^Bid / }), 'mouse', true);
  await expect(page.getByTestId('declare-form')).toBeVisible({ timeout: 20_000 });
  await clickCentre(page, page.getByRole('button', { name: 'Trump Spades' }), 'mouse', false);
  for (const rank of ['3', '4']) {
    await clickCentre(page, page.locator(`[data-testid="declare-form"] button[aria-label^="${rank} of clubs"]`), 'mouse', false);
  }
  await clickCentre(page, page.getByRole('button', { name: 'Confirm declaration' }), 'mouse', true);
  await expect(page.getByText('Your turn')).toBeVisible();
  const still = await controlBoxes(page);
  await clickCentre(page, page.getByTestId('confirm-play'), 'mouse', true);
  await expect(page.getByTestId('disabled-reason')).toContainText(/choose a card/i);
  expect(await controlBoxes(page)).toBe(still);
  const legal = page.locator('[data-testid="hand-card"][aria-disabled="false"]');
  const first = legal.first();
  const second = legal.last();
  const played = {
    suit: await second.getAttribute('data-suit'),
    rank: await second.getAttribute('data-rank'),
  };
  const kept = {
    suit: await first.getAttribute('data-suit'),
    rank: await first.getAttribute('data-rank'),
  };
  await clickCentre(page, first, 'mouse', true);
  await clickCentre(page, second, 'mouse', true);
  await clickCentre(page, page.getByTestId('confirm-play'), 'mouse', true);
  await expect(page.locator('[data-testid="trick-row"] [data-suit]').first()).toHaveAttribute('data-suit', played.suit ?? '');
  await expect(page.locator('[data-testid="trick-row"] [data-rank]').first()).toHaveAttribute('data-rank', played.rank ?? '');
  await expect(page.locator(`[data-testid="hand-card"][data-suit="${kept.suit}"][data-rank="${kept.rank}"]`)).toHaveCount(1);
});

test('new game abandons the hand and offers both variants', async ({ page }) => {
  test.setTimeout(60_000);
  await deal(page, '250', { width: 1024, height: 572 }, 'mouse');
  await expect(page.getByTestId('hand-card')).toHaveCount(8);
  await clickCentre(page, page.getByTestId('new-game'), 'mouse', true);
  await expect(page.getByTestId('abandon-confirm')).toBeVisible();
  await clickCentre(page, page.getByTestId('abandon-keep'), 'mouse', true);
  await expect(page.getByTestId('hand-card')).toHaveCount(8);
  await clickCentre(page, page.getByTestId('new-game'), 'mouse', true);
  await clickCentre(page, page.getByTestId('abandon-yes'), 'mouse', true);
  await expect(page.getByRole('button', { name: /^500/ })).toBeVisible();
  await clickCentre(page, page.getByRole('button', { name: /^500/ }), 'mouse', true);
  await clickCentre(page, page.getByLabel('Your name'), 'mouse', true);
  await page.keyboard.type('Ada');
  await clickCentre(page, page.getByTestId('start-vs-bots'), 'mouse', true);
  await expect(page.getByTestId('hand-card')).toHaveCount(12);
});
