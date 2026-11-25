import { expect, test } from '@playwright/test';
import { assertHandCorners, saveShot } from './visible-hand';

async function clickLegalFace(page: import('@playwright/test').Page): Promise<boolean> {
  const point = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('[data-testid="hand-card"]')];
    const labelAt = (x: number, y: number): string => document.elementFromPoint(x, y)?.closest('[data-testid="hand-card"]')?.getAttribute('aria-label') ?? '';
    for (const button of buttons) {
      if (button.getAttribute('aria-disabled') === 'true') continue;
      const svg = button.querySelector('svg');
      if (!(svg instanceof SVGSVGElement)) continue;
      const ctm = svg.getScreenCTM();
      const at = (x: number, y: number): { x: number; y: number } => {
        const spot = svg.createSVGPoint();
        spot.x = x;
        spot.y = y;
        const screen = ctm ? spot.matrixTransform(ctm) : spot;
        return { x: screen.x, y: screen.y };
      };
      const label = button.getAttribute('aria-label') ?? '';
      const hit = [at(48, 70), at(125, 175), at(48, 140)].find((item) => labelAt(item.x, item.y) === label);
      if (hit) return hit;
    }
    return null;
  });
  if (!point) return false;
  await page.mouse.click(point.x, point.y);
  return true;
}

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
  await saveShot(page, `/opt/cursor/artifacts/bidding-hand-${label}.png`, true);
  const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(scrolls).toBe(false);
  let paused = false;
  let hiddenShot = false;
  for (let step = 0; step < 500; step += 1) {
    if (variant === '250' && !hiddenShot && (await page.getByText('Partners: none yet').isVisible().catch(() => false))) {
      await saveShot(page, `/opt/cursor/artifacts/hidden-partners-${label}.png`, true);
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
    if (await clickLegalFace(page)) {
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
  await saveShot(page, `/opt/cursor/artifacts/local-table-${label}.png`, true);
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
    await saveShot(page, `/opt/cursor/artifacts/trick-pause-${label}.png`, true);
  }
  await expect(pause).toBeHidden({ timeout: 5_000 });
  return true;
}

async function showWorstScores(
  page: import('@playwright/test').Page,
  view: { width: number; height: number; variant: '250' | '500'; score: number },
): Promise<void> {
  await page.setViewportSize({ width: view.width, height: view.height });
  await page.goto('/play');
  await page.getByRole('button', { name: new RegExp(`^${view.variant}`) }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByTestId('start-vs-bots').click();
  await page.getByTestId('score-chip').first().waitFor();
  await page.evaluate((score) => {
    const host = window as unknown as {
      __localPlay: {
        getState: () => { seatOrder: string[]; hand: { bidder: string | null } };
        setState: (partial: unknown) => void;
      };
      __chipCue?: { turnId: string; bidderId: string };
    };
    const state = host.__localPlay.getState();
    const bidderId = state.seatOrder[state.seatOrder.length - 1] ?? 'p1';
    const scores = Object.fromEntries(state.seatOrder.map((id) => [id, score]));
    host.__chipCue = { turnId: bidderId, bidderId };
    host.__localPlay.setState({
      runningScores: scores,
      phase: 'scored',
      settledTrick: null,
      summary: {
        bidMade: false,
        pointsCollected: 0,
        partners: [],
        bidAmount: state.seatOrder.length === 8 ? 300 : 160,
        bidder: bidderId,
        scoreDeltas: scores,
      },
      hand: { ...state.hand, bidder: bidderId, toPlayerId: bidderId },
    });
  }, view.score);
  await expect(page.getByTestId('hand-complete')).toBeVisible();
  await expect(page.getByTestId('score-chip-score').first()).toHaveText(String(view.score));
}

async function assertReadableChips(page: import('@playwright/test').Page, players: number, score: number): Promise<void> {
  await expect(page.getByTestId('turn-marker')).toHaveCount(1);
  await expect(page.getByTestId('bidder-marker')).toHaveCount(1);
  const report = await page.evaluate((count) => {
    const strip = document.querySelector('[data-testid="score-strip"]');
    const chips = [...document.querySelectorAll('[data-testid="score-chip"]')];
    const problems: string[] = [];
    const clips = (node: Element, box: DOMRect): boolean => {
      let parent = node.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        const hidden = (value: string): boolean => value === 'hidden' || value === 'clip' || value === 'auto' || value === 'scroll';
        if (hidden(style.overflowX) || hidden(style.overflowY)) {
          const frame = parent.getBoundingClientRect();
          if (box.left < frame.left - 0.5 || box.right > frame.right + 0.5 || box.top < frame.top - 0.5 || box.bottom > frame.bottom + 0.5) return true;
        }
        parent = parent.parentElement;
      }
      return false;
    };
    const boxes = chips.map((chip) => chip.getBoundingClientRect());
    const heights = boxes.map((box) => box.height);
    if (heights.length > 0 && Math.max(...heights) - Math.min(...heights) > 1) problems.push('chip heights differ');
    const rows = new Map<number, number>();
    boxes.forEach((box) => {
      const top = Math.round(box.top);
      rows.set(top, (rows.get(top) ?? 0) + 1);
    });
    const rowCount = rows.size;
    if (rowCount > 2) problems.push(`${rowCount} rows`);
    if (rowCount === 2) {
      const sizes = [...rows.values()];
      if (sizes[0] !== sizes[1] || sizes[0] !== count / 2) problems.push(`unbalanced rows ${sizes.join('+')}`);
    }
    const own = chips[0];
    if (own && !own.getAttribute('aria-label')?.startsWith('Ada')) problems.push('own chip is not first');
    chips.forEach((chip, index) => {
      if (!(chip instanceof HTMLElement)) return;
      const box = boxes[index];
      if (!box) return;
      if (box.left < 8 || box.right > window.innerWidth - 8) problems.push(`chip ${index} margin ${box.left.toFixed(1)}-${box.right.toFixed(1)}`);
      if (box.top < 0 || box.bottom > window.innerHeight) problems.push(`chip ${index} off the screen`);
      if (chip.scrollWidth > chip.clientWidth + 0.5 || chip.scrollHeight > chip.clientHeight + 0.5) problems.push(`chip ${index} clips itself`);
      if (clips(chip, box)) problems.push(`chip ${index} clipped by a parent`);
      const text = chip.querySelector('[data-testid="score-chip-score"]');
      if (!(text instanceof HTMLElement)) {
        problems.push(`chip ${index} has no score`);
        return;
      }
      const size = Number.parseFloat(getComputedStyle(text).fontSize);
      if (size < 12) problems.push(`chip ${index} score is ${size}px`);
      const ink = text.getBoundingClientRect();
      if (ink.left < box.left + 4 || ink.right > box.right - 4 || ink.top < box.top + 4 || ink.bottom > box.bottom - 4) {
        problems.push(`chip ${index} score padding`);
      }
    });
    return {
      count: chips.length,
      rows: strip?.getAttribute('data-rows') ?? '',
      problems,
      scores: chips.map((chip) => chip.querySelector('[data-testid="score-chip-score"]')?.textContent ?? ''),
    };
  }, players);
  expect(report.count).toBe(players);
  expect(report.scores.every((value) => value === String(score)), report.scores.join(',')).toBe(true);
  expect(report.problems, report.problems.join('\n')).toEqual([]);
  if (players === 8 && score === -1500) expect(report.rows, 'eight scores of -1500 fit only on two rows').toBe('2');
}

async function shootSelector(page: import('@playwright/test').Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/play');
  await page.getByRole('button', { name: /^250/ }).click();
  await expect(page.getByTestId('difficulty-easy')).toHaveAttribute('aria-pressed', 'true');
  await saveShot(page, `/opt/cursor/artifacts/difficulty-${width}x${height}.png`, false);
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
  if (height > 760 && width >= 720) await expect(page.getByTestId('auction-recap')).toBeVisible();
  await saveShot(page, shot, false);
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

  test('normal hand at 390', async ({ page }) => {
    test.setTimeout(180_000);
    await shootSelector(page, 390, 844);
    await playOneHand(page, '500', 'Normal');
  });

  test('score chips stay readable at 12px', async ({ page }) => {
    const cases = [
      { width: 360, height: 740, variant: '500' as const, score: -1500, players: 8, shot: 'worst-scores-360x740' },
      { width: 390, height: 844, variant: '500' as const, score: -1500, players: 8, shot: 'worst-scores-390x844' },
      { width: 360, height: 740, variant: '250' as const, score: -1000, players: 6, shot: 'worst-scores-250-360x740' },
      { width: 390, height: 844, variant: '250' as const, score: -1000, players: 6, shot: 'worst-scores-250-390x844' },
      { width: 360, height: 740, variant: '500' as const, score: -835, players: 8, shot: 'realistic-scores-360x740' },
      { width: 390, height: 844, variant: '500' as const, score: -835, players: 8, shot: 'realistic-scores-390x844' },
    ];
    for (const view of cases) {
      await showWorstScores(page, view);
      await assertReadableChips(page, view.players, view.score);
      await saveShot(page, `/opt/cursor/artifacts/${view.shot}.png`, false);
    }
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
    await saveShot(page, '/opt/cursor/artifacts/declare-footer-390.png', false);
    expect(errors).toEqual([]);
  });
});
