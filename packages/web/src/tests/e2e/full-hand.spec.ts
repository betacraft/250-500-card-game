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
        if (view.width === 360 || view.width === 390) {
          await assertSlivers(page);
          if (variant === '500') await assertFanFits(page);
          await assertHomeZone(page, 34);
          await page.screenshot({ path: `/opt/cursor/artifacts/bottom-zone-${variant}-${view.width}x${view.height}-bid.png`, fullPage: false });
          if (variant === '500' && view.width === 360) await page.screenshot({ path: '/opt/cursor/artifacts/fan-500-360-12.png', fullPage: false });
          if (variant === '500' && view.width === 390) await page.screenshot({ path: '/opt/cursor/artifacts/fan-500-390-12.png', fullPage: false });
        }
        if (view.width >= 720) {
          const pad = await page.getByTestId('hand-dock').evaluate((node) => Number.parseFloat(getComputedStyle(node).paddingBottom));
          expect(pad).toBeGreaterThanOrEqual(12);
          expect(pad).toBeLessThan(20);
        }
        await loseAuction(page, input);
        const lostWidths: number[] = [];
        const clubsFollow = { pending: variant === '500' && view.width === 360 };
        await finishHand(page, input, true, lostWidths, clubsFollow);
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
        if (isPhone(view)) {
          await assertHomeZone(page, 34);
          await page.screenshot({ path: `/opt/cursor/artifacts/bottom-zone-${variant}-${view.width}x${view.height}-play.png`, fullPage: false });
        }
        if (variant === '500' && view.width === 360) {
          await page.screenshot({ path: '/opt/cursor/artifacts/play-500-360x740.png', fullPage: false });
          await assertFanFits(page);
        }
        await assertBoard(page, view, false);
        sizes.push(await assertHandSize(page));
        expect(new Set(sizes).size, `hand widths ${sizes.join(',')}`).toBe(1);
        if (view.width === 1024 || (view.width === 360 && variant === '250')) expect(sizes[0]).toBeGreaterThanOrEqual(80);
        if (view.width === 360 && variant === '500') expect(sizes[0]).toBeGreaterThanOrEqual(60);
        await assertHandCorners(page);
        await assertFaceCentres(page);
        if (variant === '500' && view.width === 360) await shootClubsLead(page, input);
        const wonWidths: number[] = [];
        await finishHand(page, input, false, wonWidths, clubsFollow);
        if (variant === '500' && view.width === 360) expect(clubsFollow.pending, 'never followed a clubs lead').toBe(false);
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
    await clickCentre(page, page.getByRole('button', { name: `Trump: ${suit}` }), input, ranksPinned);
  }
  for (const suit of suits) {
    for (const rank of ranks) {
      await clickCentre(page, page.locator(`[data-testid="declare-form"] button[aria-label^="${rank} of ${suit}"]`), input, ranksPinned);
    }
  }
  const confirm = page.getByRole('button', { name: 'Confirm declaration' });
  await expect(confirm).toHaveAttribute('aria-disabled', 'false');
  await clickCentre(page, confirm, input, true);
}

async function shootClubsLead(page: Page, input: 'mouse' | 'touch'): Promise<void> {
  const club = page.locator('[data-testid="hand-card"][aria-disabled="false"][data-suit="clubs"]').first();
  if ((await club.count()) === 0) return;
  await clickCentre(page, club, input, true);
  await clickCentre(page, page.getByTestId('confirm-play'), input, true);
  await expect(page.getByTestId('led-suit')).toHaveAttribute('data-suit', 'clubs', { timeout: 2_000 });
  await page.screenshot({ path: '/opt/cursor/artifacts/play-500-360-clubs-lead.png', fullPage: false });
}

async function assertFanFits(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const found: string[] = [];
    const cards = [...document.querySelectorAll('[data-testid="hand-card"]')];
    const fan = document.querySelector('[data-testid="hand-fan"]');
    const clips = (node: Element, box: DOMRect): boolean => {
      let parent = node.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        const hidden = (value: string): boolean => value === 'hidden' || value === 'clip' || value === 'auto' || value === 'scroll';
        if (hidden(style.overflowX) || hidden(style.overflowY)) {
          const clip = parent.getBoundingClientRect();
          if (box.left < clip.left - 0.5 || box.right > clip.right + 0.5 || box.top < clip.top - 0.5 || box.bottom > clip.bottom + 0.5) return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };
    cards.forEach((card, index) => {
      const box = card.getBoundingClientRect();
      if (box.left < 7.5 || box.right > window.innerWidth - 7.5 || box.top < -0.5 || box.bottom > window.innerHeight + 0.5) {
        found.push(`card ${index} outside ${box.left.toFixed(1)}-${box.right.toFixed(1)}`);
      }
      if (clips(card, box)) found.push(`card ${index} clipped`);
    });
    const last = cards[cards.length - 1];
    if (last instanceof HTMLElement) {
      const box = last.getBoundingClientRect();
      const laid = Number.parseFloat(last.style.width);
      if (box.width + 0.5 < laid) found.push(`last card shows ${box.width.toFixed(1)} of ${laid}`);
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      if (hit !== last && !(hit && last.contains(hit))) found.push('last card centre missed');
    }
    if (fan) {
      const area = fan.getBoundingClientRect();
      for (let y = area.top + 4; y < area.bottom - 4; y += 10) {
        for (let x = area.left + 4; x < area.right - 4; x += 12) {
          const node = document.elementFromPoint(x, y);
          if (node && node !== fan && !fan.contains(node)) {
            found.push(`foreign ${node.tagName} over the fan`);
            return found;
          }
        }
      }
    }
    return found;
  });
  expect(problems, problems.join('\n')).toEqual([]);
}

async function assertSlivers(page: Page): Promise<void> {
  const hits = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid="hand-card"]')];
    return cards.map((card) => {
      const box = card.getBoundingClientRect();
      let hit = 0;
      const y = box.top + box.height * 0.42;
      for (let x = Math.floor(box.left); x <= Math.ceil(box.right); x += 1) {
        const node = document.elementFromPoint(x + 0.5, y);
        if (node === card || (node !== null && card.contains(node))) hit += 1;
      }
      return `${card.getAttribute('aria-label') ?? 'card'} ${hit}px`;
    });
  });
  const narrow = hits.filter((item) => Number(item.match(/(\d+)px$/)?.[1] ?? '0') < 24);
  expect(narrow, narrow.join(', ')).toEqual([]);
}

/** On one 250 phone hand, leave the final banner up, then let the 1.5s timer open the result. */
async function holdFinalBanner(page: Page): Promise<boolean> {
  const size = page.viewportSize();
  const title = await page.locator('h1').textContent();
  if (size?.width !== 390 || size.height !== 844 || !title?.includes('250')) return false;
  const seen = await page.evaluate(() => document.body.getAttribute('data-last-shot') === '1');
  if (seen) return false;
  await page.evaluate(() => document.body.setAttribute('data-last-shot', '1'));
  await page.waitForTimeout(1000);
  await expect(page.getByText(/won the trick · tap to skip/)).toBeVisible();
  await expect(page.getByTestId('hand-complete')).toHaveCount(0);
  await page.screenshot({ path: '/opt/cursor/artifacts/last-trick-390x844.png', fullPage: false });
  await expect(page.getByTestId('hand-complete')).toBeVisible({ timeout: 2_000 });
  return true;
}

async function finishHand(
  page: Page,
  input: 'mouse' | 'touch',
  holdScores: boolean,
  widths: number[],
  clubsFollow: { pending: boolean } = { pending: false },
): Promise<void> {
  let sawFinal = false;
  for (let guard = 0; guard < 500; guard += 1) {
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) {
      expect(sawFinal, 'the result replaced the last trick').toBe(true);
      return;
    }
    if (await page.getByTestId('trick-pause').isVisible().catch(() => false)) {
      const cardsLeft = await page.locator('[data-testid="hand-card"]').count();
      if (holdScores && cardsLeft === 0) {
        const scores = await page.locator('[data-testid="score-chip-score"]').allTextContents();
        expect(scores.every((score) => score.trim() === '0')).toBe(true);
      }
      const width = await page.getByTestId('trick-winner').getAttribute('data-card-width');
      if (width) widths.push(Number(width));
      await expect(page.getByText(/won the trick · tap to skip/)).toBeVisible();
      await assertTableFacts(page);
      if (cardsLeft === 0) {
        sawFinal = true;
        await expect(page.getByTestId('hand-complete')).toHaveCount(0);
        if (await holdFinalBanner(page)) continue;
      }
      await clickCentre(page, page.getByTestId('trick-pause'), input, false);
      continue;
    }
    if (await page.getByText('Your turn').isVisible().catch(() => false)) {
      if (clubsFollow.pending) {
        const followingClubs = await page.evaluate(() => {
          const led = document.querySelector('[data-testid="led-suit"]')?.getAttribute('data-suit');
          const played = document.querySelectorAll('[data-testid="trick-row"] [data-suit]').length;
          return led === 'clubs' && played > 0;
        });
        if (followingClubs) {
          await page.screenshot({ path: '/opt/cursor/artifacts/play-500-360-clubs-follow.png', fullPage: false });
          clubsFollow.pending = false;
        }
      }
      await assertFaceCentres(page);
      await assertTableFacts(page);
      const legal = page.locator('[data-testid="hand-card"][aria-disabled="false"]').first();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await clickCentre(page, legal, input, true);
        if ((await legal.getAttribute('data-selected')) === 'true') break;
      }
      await expect(legal).toHaveAttribute('data-selected', 'true');
      await clickCentre(page, page.getByTestId('confirm-play'), input, true);
      await expect(page.getByText('Your turn')).toBeHidden({ timeout: 2_000 });
      continue;
    }
    await page.waitForTimeout(40);
  }
  throw new Error('hand did not finish');
}

async function assertHomeZone(page: Page, gap: number): Promise<void> {
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('viewport-fit=cover');
  const problems = await page.evaluate((minGap) => {
    const found: string[] = [];
    const nodes = [
      ...document.querySelectorAll('[data-testid="hand-card"]'),
      ...document.querySelectorAll('[data-testid="confirm-play"]'),
    ];
    nodes.forEach((node) => {
      const box = node.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;
      const clearance = window.innerHeight - box.bottom;
      const name = node.getAttribute('aria-label') || node.getAttribute('data-testid') || 'control';
      if (clearance < minGap - 0.5) found.push(`${name} clearance ${clearance.toFixed(1)}`);
    });
    return found;
  }, gap);
  expect(problems, problems.join('\n')).toEqual([]);
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
  const target = locator.first();
  await target.waitFor({ state: 'visible' });
  let detail = 'unset';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const first = await target.evaluate(readCentre, pinned);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const second = await target.evaluate(readCentre, pinned);
    const box = await target.boundingBox();
    detail = second.detail;
    const stable = Boolean(box) && first.ok && second.ok && Math.abs(first.x - second.x) < 0.6 && Math.abs(first.y - second.y) < 0.6;
    if (!stable || !box) {
      await page.waitForTimeout(40);
      continue;
    }
    if (input === 'touch') await page.touchscreen.tap(second.x, second.y);
    else await page.mouse.click(second.x, second.y, { delay: 0 });
    const selected = await target.getAttribute('data-selected').catch(() => null);
    if (selected === 'false') {
      await page.waitForTimeout(30);
      continue;
    }
    return;
  }
  expect(detail, detail).toBe('stable hit');
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
  if (node.getAttribute('data-testid') === 'hand-card') {
    for (const [fx, fy] of [[0.16, 0.7], [0.22, 0.55], [0.14, 0.42], [0.5, 0.5]] as const) {
      const x = box.left + box.width * fx;
      const y = box.top + box.height * fy;
      if (hits(x, y) && hits(x + 4, y) && hits(x - 4, y)) return { x, y, ok: true, detail: label };
    }
  }
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
  await clickCentre(page, page.getByRole('button', { name: 'Trump: Spades' }), 'mouse', false);
  for (const rank of ['3', '4']) {
    await clickCentre(page, page.locator(`[data-testid="declare-form"] button[aria-label^="${rank} of clubs"]`), 'mouse', false);
  }
  const confirm = page.getByRole('button', { name: 'Confirm declaration' });
  await expect(confirm).toHaveAttribute('aria-disabled', 'false');
  await clickCentre(page, confirm, 'mouse', true);
  await expect(page.getByText('Your turn')).toBeVisible({ timeout: 20_000 });
  const still = await controlBoxes(page);
  await clickCentre(page, page.getByTestId('confirm-play'), 'mouse', true);
  await expect(page.getByTestId('disabled-reason')).toContainText('Tap a card, then Play');
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
