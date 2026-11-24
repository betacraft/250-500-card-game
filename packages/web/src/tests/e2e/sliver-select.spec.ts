import { expect, test, type Page } from '@playwright/test';

test.describe('a lifted card does not steal the next sliver', () => {
  test.describe.configure({ timeout: 180_000 });

  test('500 at 360 switches along every visible sliver', async ({ page }) => {
    await reachLead(page, '500', 12);
    await tapSliver(page, 0);
    await expect(page.locator('[data-testid="hand-card"]').nth(0)).toHaveAttribute('data-selected', 'true');
    await page.screenshot({ path: '/opt/cursor/artifacts/sliver-500-360.png', fullPage: false });
    await switchEveryNeighbour(page, 12);
  });

  test('250 at 360 switches along every visible sliver', async ({ page }) => {
    await reachLead(page, '250', 8);
    await switchEveryNeighbour(page, 8);
  });
});

async function reachLead(page: Page, variant: '250' | '500', cards: number): Promise<void> {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/play');
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').fill('Ada');
  await page.getByTestId('start-vs-bots').click();
  await expect(page.getByTestId('hand-card')).toHaveCount(cards);
  for (let guard = 0; guard < 40; guard += 1) {
    if (await page.getByText('Your turn').isVisible().catch(() => false)) return;
    if (await page.getByTestId('declare-form').isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Trump: Spades' }).click();
      const need = variant === '250' ? 2 : 3;
      const ranks = ['3', '4', '5'];
      for (let i = 0; i < need; i += 1) {
        await page.locator(`[data-testid="declare-form"] button[aria-label^="${ranks[i]} of clubs"]`).click();
      }
      const confirm = page.getByRole('button', { name: 'Confirm declaration' });
      await expect(confirm).toHaveAttribute('aria-disabled', 'false');
      await confirm.click();
      await expect(page.getByText('Your turn')).toBeVisible({ timeout: 20_000 });
      return;
    }
    const bid = page.getByRole('button', { name: /^Bid / });
    if (await bid.isVisible().catch(() => false)) {
      for (let i = 0; i < 24; i += 1) {
        const add = page.getByRole('button', { name: 'Add 20 to the bid' });
        if ((await add.getAttribute('aria-disabled')) === 'true') break;
        await add.click();
      }
      await bid.click();
      continue;
    }
    await page.waitForTimeout(40);
  }
  throw new Error('did not reach a lead');
}

async function switchEveryNeighbour(page: Page, count: number): Promise<void> {
  const cards = page.locator('[data-testid="hand-card"]');
  await expect(cards).toHaveCount(count);
  for (let index = 0; index < count - 1; index += 1) {
    await tapSliver(page, index);
    await expect(cards.nth(index)).toHaveAttribute('data-selected', 'true');
    await tapSliver(page, index + 1);
    await expect(cards.nth(index + 1)).toHaveAttribute('data-selected', 'true');
    await expect(cards.nth(index)).toHaveAttribute('data-selected', 'false');
  }
}

async function tapSliver(page: Page, index: number): Promise<void> {
  const point = await page.locator('[data-testid="hand-card"]').nth(index).evaluate((card) => {
    const box = card.getBoundingClientRect();
    const y = box.top + Math.min(box.height * 0.55, box.height - 8);
    let left = -1;
    let right = -1;
    for (let x = Math.floor(box.left); x <= Math.ceil(box.right); x += 1) {
      const hit = document.elementFromPoint(x + 0.5, y);
      if (hit === card || (hit !== null && card.contains(hit))) {
        if (left < 0) left = x;
        right = x;
      }
    }
    if (left < 0) return null;
    return { x: (left + right) / 2 + 0.5, y };
  });
  if (!point) throw new Error(`card ${index} has no visible sliver`);
  await page.mouse.click(point.x, point.y);
}
