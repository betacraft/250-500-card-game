import { expect, test, type Page } from '@playwright/test';

const cases = [
  { variant: '250' as const, width: 1366, height: 768, need: 2 },
  { variant: '250' as const, width: 360, height: 740, need: 2 },
  { variant: '500' as const, width: 1366, height: 768, need: 3 },
  { variant: '500' as const, width: 360, height: 740, need: 3 },
];

test.describe('declaration confirm uses the committed calls', () => {
  for (const item of cases) {
    test(`${item.variant} at ${item.width}`, async ({ page }) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await reachDeclaration(page, item.variant, item.width, item.height);
      const grid = page.getByTestId('rank-grid');
      await page.getByRole('button', { name: 'Trump: Hearts' }).click();
      for (let index = 0; index < item.need; index += 1) {
        await grid.getByRole('button', { name: new RegExp(`^${index + 3} of clubs`) }).click();
      }
      const confirm = page.getByRole('button', { name: 'Confirm declaration' });
      await expect(confirm).toHaveAttribute('aria-disabled', 'false');

      for (let attempt = 0; attempt < 20; attempt += 1) {
        const label = await page.evaluate(() => {
          const button = [...document.querySelectorAll('button')].find((node) => (node.textContent ?? '').trim() === 'Confirm declaration');
          const target = document.querySelector('[data-testid="rank-grid"] button[aria-pressed="true"]');
          if (!button || !target) return '';
          const observer = new MutationObserver(() => {
            observer.disconnect();
            if (button instanceof HTMLButtonElement) button.click();
          });
          observer.observe(target, { attributes: true, attributeFilter: ['aria-pressed'] });
          return target.getAttribute('aria-label') ?? '';
        });
        await grid.getByRole('button', { name: label, exact: true }).click({ delay: 0 });
        await expect(page.getByTestId('declare-form')).toBeVisible();
        await grid.getByRole('button', { name: label, exact: true }).click({ delay: 0 });
        await expect(confirm).toHaveAttribute('aria-disabled', 'false');
      }

      const selected = grid.locator('button[aria-pressed="true"]');
      while ((await selected.count()) > 0) await selected.first().click();
      await expect(confirm).toHaveAttribute('aria-disabled', 'true');
      const picked = item.need === 2 ? ['9', '10'] : ['9', '10', 'J'];
      const boxes = [];
      for (const rank of picked) {
        const box = await grid.getByRole('button', { name: new RegExp(`^${rank} of diamonds`) }).boundingBox();
        if (!box) throw new Error(`missing ${rank} of diamonds`);
        boxes.push(box);
      }
      const confirmBox = await confirm.boundingBox();
      if (!confirmBox) throw new Error('missing confirm');
      for (const box of boxes) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: 0 });
      await page.mouse.click(confirmBox.x + confirmBox.width / 2, confirmBox.y + confirmBox.height / 2, { delay: 0 });

      await expect(page.getByTestId('declare-form')).toHaveCount(0);
      await expect(page.getByTestId('called-cards').locator('svg')).toHaveCount(item.need);
      await expect(page.getByText(/Called 9d 10d/)).toBeVisible();
      if (item.variant === '250' && item.width === 1366) {
        await page.screenshot({ path: '/opt/cursor/artifacts/declare-fast-250-1366.png', fullPage: false });
      }
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});

async function reachDeclaration(page: Page, variant: '250' | '500', width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/play');
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').click();
  await page.keyboard.type('Ada');
  await page.getByTestId('start-vs-bots').click();
  await page.getByTestId('hand-fan').waitFor();
  for (let guard = 0; guard < 16; guard += 1) {
    const bid = page.getByRole('button', { name: /^Bid / });
    await expect(bid.or(page.getByTestId('declare-form'))).toBeVisible({ timeout: 20_000 });
    if (await page.getByTestId('declare-form').isVisible()) return;
    const add = page.getByRole('button', { name: 'Add 20 to the bid' });
    for (let step = 0; step < 20; step += 1) {
      if ((await add.getAttribute('aria-disabled')) === 'true') break;
      await add.click();
    }
    await bid.click();
  }
  throw new Error('auction did not reach declaration');
}
