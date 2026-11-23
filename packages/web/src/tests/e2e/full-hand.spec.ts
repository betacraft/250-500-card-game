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
        await assertBoard(page, view, true);
        if (variant === '500' && view.width === 360) {
          await page.screenshot({ path: '/opt/cursor/artifacts/chips-500-360x740.png', fullPage: false });
        }
        if (view.width === 360 || view.width === 390) {
          await page.screenshot({ path: `/opt/cursor/artifacts/declare-${variant}-${view.width}x${view.height}.png`, fullPage: false });
        }
        await declare(page, input, isPhone(view));
        await expect(page.getByText('Your turn')).toBeVisible();
        if (variant === '500' && view.width === 360) {
          await page.screenshot({ path: '/opt/cursor/artifacts/play-500-360x740.png', fullPage: false });
        }
        await assertBoard(page, view, false);
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

async function declare(page: Page, input: 'mouse' | 'touch', ranksPinned: boolean): Promise<void> {
  await clickCentre(page, page.getByRole('button', { name: 'Confirm declaration' }), input, true);
  await expect(page.getByTestId('disabled-reason')).toContainText(/trump/i);
  for (const suit of ['Hearts', 'Diamonds', 'Clubs', 'Spades']) {
    await clickCentre(page, page.getByRole('button', { name: `Trump ${suit}` }), input, ranksPinned);
  }
  for (const suit of suits) {
    for (const rank of ranks) {
      await clickCentre(page, page.locator(`[data-testid="declare-form"] button[aria-label^="${rank} of ${suit}"]`), input, ranksPinned);
    }
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

function isPhone(view: { width: number; height: number }): boolean {
  return (view.width === 360 && view.height === 740) || (view.width === 390 && view.height === 844);
}

async function assertBoard(page: Page, view: { width: number; height: number }, ranks: boolean): Promise<void> {
  await page.evaluate(resetScroll);
  const report = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('[data-testid="score-chip"]')];
    const tops = chips.map((chip) => chip.getBoundingClientRect().top);
    const cards = [...document.querySelectorAll('[data-testid="hand-card"]')];
    const bottoms = cards.map((card) => (card instanceof HTMLElement ? card.style.bottom : ''));
    const dock = document.querySelector('[data-testid="hand-dock"]')?.getBoundingClientRect();
    const cells = [...document.querySelectorAll('[data-testid="rank-grid"] button')];
    const misses: string[] = [];
    cells.forEach((cell) => {
      const box = cell.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (hit !== cell && !(hit && cell.contains(hit))) misses.push((cell.getAttribute('aria-label') ?? 'cell').slice(0, 24));
    });
    return {
      chipSpread: tops.length ? Math.max(...tops) - Math.min(...tops) : 0,
      chips: chips.length,
      oneRow: bottoms.length > 0 && new Set(bottoms).size === 1,
      dockRatio: dock ? dock.height / window.innerHeight : 1,
      cells: cells.length,
      misses,
    };
  });
  expect(report.chips).toBeGreaterThan(0);
  expect(report.chipSpread, 'chips wrapped onto a second row').toBeLessThan(1);
  expect(report.oneRow, 'hand is not one row').toBe(true);
  if (isPhone(view)) expect(report.dockRatio).toBeLessThanOrEqual(0.32);
  if (ranks && isPhone(view)) {
    expect(report.cells).toBe(48);
    expect(report.misses, report.misses.join(', ')).toEqual([]);
  }
}

async function assertFaceCentres(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid="hand-card"]')];
    const bottoms = cards.map((card) => (card instanceof HTMLElement ? card.style.bottom : ''));
    const found: string[] = [];
    if (new Set(bottoms).size !== 1) found.push('hand is not one row');
    const own = (card: Element, x: number, y: number): boolean => {
      const hit = document.elementFromPoint(x, y);
      return hit === card || (!!hit && card.contains(hit));
    };
    const spotOf = (card: Element): { x: number; y: number } | null => {
      const svg = card.querySelector('svg');
      const samples = [[125, 175], [48, 70], [48, 150], [70, 40], [190, 80], [125, 60]];
      if (!(svg instanceof SVGSVGElement)) {
        const box = card.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      }
      const ctm = svg.getScreenCTM();
      for (const pair of samples) {
        const point = svg.createSVGPoint();
        point.x = pair[0] ?? 0;
        point.y = pair[1] ?? 0;
        const screen = ctm ? point.matrixTransform(ctm) : point;
        if (own(card, screen.x, screen.y)) return { x: screen.x, y: screen.y };
      }
      return null;
    };
    cards.forEach((card) => {
      const spot = spotOf(card);
      if (!spot) found.push(`${card.getAttribute('aria-label') ?? 'card'} has no open point`);
    });
    const top = cards[cards.length - 1];
    if (top) {
      const box = top.getBoundingClientRect();
      if (!own(top, box.left + box.width / 2, box.top + box.height / 2)) found.push('last card centre missed');
    }
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
  const label = node.getAttribute('aria-label') ?? (node.textContent ?? '').trim().slice(0, 40);
  const dock = document.querySelector('[data-testid="hand-dock"]');
  const inDock = dock?.contains(node) ?? false;
  const hits = (x: number, y: number): boolean => {
    if (!inDock && dock && y >= dock.getBoundingClientRect().top - 0.5) return false;
    const hit = document.elementFromPoint(x, y);
    return hit === node || (!!hit && node.contains(hit));
  };
  const box = node.getBoundingClientRect();
  const centre = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  if (hits(centre.x, centre.y)) return { x: centre.x, y: centre.y, ok: true, detail: label };
  const svg = node.querySelector('svg');
  if (svg instanceof SVGSVGElement) {
    const ctm = svg.getScreenCTM();
    for (const pair of [[48, 70], [48, 150], [70, 40], [190, 80], [125, 60], [125, 175]]) {
      const point = svg.createSVGPoint();
      point.x = pair[0] ?? 0;
      point.y = pair[1] ?? 0;
      const screen = ctm ? point.matrixTransform(ctm) : point;
      if (hits(screen.x, screen.y)) return { x: screen.x, y: screen.y, ok: true, detail: label };
    }
  }
  const other = document.elementFromPoint(centre.x, centre.y)?.closest('button')?.getAttribute('aria-label') ?? 'nothing';
  return { x: centre.x, y: centre.y, ok: false, detail: `${label} centre hit ${other}` };
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
