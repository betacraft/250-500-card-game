import { expect, test, type Page } from '@playwright/test';

const views = [
  { width: 1024, height: 572, shot: true },
  { width: 1280, height: 800, shot: false },
  { width: 1366, height: 768, shot: false },
  { width: 390, height: 844, shot: false },
  { width: 360, height: 740, shot: true },
] as const;

async function reachTurn(page: Page, variant: '250' | '500', width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/play');
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByTestId('start-vs-bots').click();
  await page.getByTestId('hand-fan').waitFor();
  for (let i = 0; i < 16; i += 1) {
    const add = page.getByRole('button', { name: 'Add 20 to the bid' });
    if (!(await add.isVisible().catch(() => false)) || (await add.isDisabled().catch(() => true))) break;
    await add.click();
  }
  await page.getByRole('button', { name: /^Bid / }).click();
  await page.getByRole('button', { name: 'Trump Spades' }).click();
  const need = variant === '250' ? 2 : 3;
  for (const rank of ['3', '4', '5'].slice(0, need)) {
    await page.locator(`[data-testid="declare-form"] button[aria-label^="${rank} of clubs"]`).click();
  }
  await page.getByRole('button', { name: 'Confirm declaration' }).click();
  await page.getByText('Your turn').waitFor();
}

async function facePoints(page: Page): Promise<{ label: string; centre: { x: number; y: number }; exposed: { x: number; y: number } | null; centreHit: string }[]> {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll('[data-testid="hand-card"]')];
    const labelAt = (x: number, y: number): string => document.elementFromPoint(x, y)?.closest('[data-testid="hand-card"]')?.getAttribute('aria-label') ?? '';
    return buttons.map((button) => {
      const svg = button.querySelector('svg');
      const label = button.getAttribute('aria-label') ?? '';
      if (!(svg instanceof SVGSVGElement)) return { label, centre: { x: 0, y: 0 }, exposed: null, centreHit: '' };
      const ctm = svg.getScreenCTM();
      const at = (x: number, y: number): { x: number; y: number } => {
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        const screen = ctm ? point.matrixTransform(ctm) : point;
        return { x: screen.x, y: screen.y };
      };
      const centre = at(125, 175);
      const samples = [at(48, 70), at(48, 140), at(70, 40), at(125, 60), centre];
      const exposed = samples.find((point) => labelAt(point.x, point.y) === label) ?? null;
      return { label, centre, exposed, centreHit: labelAt(centre.x, centre.y) };
    });
  });
}

async function assertFaces(page: Page): Promise<void> {
  const faces = await facePoints(page);
  expect(faces.length).toBeGreaterThan(0);
  const top = faces[faces.length - 1];
  expect(top?.centreHit, `top ${top?.label ?? ''}`).toBe(top?.label);
  for (const face of faces) expect(face.exposed, `exposed ${face.label}`).not.toBeNull();
}

async function clickFace(page: Page, input: 'mouse' | 'touch', label: string): Promise<void> {
  const face = (await facePoints(page)).find((item) => item.label === label);
  const point = face?.exposed;
  if (!point) throw new Error(`missing face ${label}`);
  if (input === 'mouse') await page.mouse.click(point.x, point.y);
  else await page.touchscreen.tap(point.x, point.y);
}

async function playByFaces(page: Page, input: 'mouse' | 'touch', shot: boolean, width: number, height: number): Promise<void> {
  const seen = new Set<number>();
  for (let guard = 0; guard < 500; guard += 1) {
    if (await page.getByTestId('hand-complete').isVisible().catch(() => false)) return;
    if (await page.getByTestId('trick-pause').isVisible().catch(() => false)) {
      if ((await page.locator('[data-testid="hand-card"]').count()) === 0) {
        const scores = await page.locator('[data-testid="score-chip-score"]').allTextContents();
        expect(scores.every((score) => score.trim() === '0')).toBe(true);
      }
      await page.getByTestId('trick-pause').click();
      continue;
    }
    if (!(await page.getByText('Your turn').isVisible().catch(() => false))) {
      await page.waitForTimeout(80);
      continue;
    }
    const count = await page.locator('[data-testid="hand-card"]').count();
    await assertFaces(page);
    if (shot && (count === 1 || count === 4 || count === 12) && !seen.has(count)) {
      seen.add(count);
      await page.evaluate(() => {
        document.querySelectorAll('[data-testid="hand-card"]').forEach((node) => {
          if (node instanceof HTMLElement) node.style.outline = '2px solid #E11D48';
        });
      });
      await page.screenshot({ path: `/opt/cursor/artifacts/hit-${count}-${width}x${height}.png`, fullPage: false });
    }
    const label = await page.locator('[data-testid="hand-card"][aria-disabled="false"]').first().getAttribute('aria-label');
    if (!label) throw new Error('no legal face');
    await clickFace(page, input, label);
    const confirm = page.getByTestId('confirm-play');
    await expect(confirm, label).toBeVisible({ timeout: 1500 });
    await confirm.click();
  }
  throw new Error('hand did not finish');
}

test.describe('card faces receive the click', () => {
  test.describe.configure({ timeout: 180_000 });

  for (const input of ['mouse', 'touch'] as const) {
    for (const variant of ['250', '500'] as const) {
      for (const view of views) {
        test(`${input} ${variant} at ${view.width}x${view.height}`, async ({ page }) => {
          test.setTimeout(150_000);
          const errors: string[] = [];
          page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
          page.on('pageerror', (error) => errors.push(error.message));
          await reachTurn(page, variant, view.width, view.height);
          await playByFaces(page, input, input === 'mouse' && view.shot, view.width, view.height);
          await expect(page.getByTestId('hand-complete')).toBeVisible();
          expect(errors, errors.join('\n')).toEqual([]);
        });
      }
    }
  }
});
