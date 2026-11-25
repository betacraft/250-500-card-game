import { expect, test, type Page } from '@playwright/test';
import { saveShot } from './visible-hand';

test.describe('trick seat labels stay on the felt', () => {
  test.describe.configure({ timeout: 60_000 });

  for (const view of [
    { variant: '500' as const, width: 320, height: 568, cards: 8, shot: 'trick-labels-500-320.png' },
    { variant: '500' as const, width: 360, height: 740, cards: 8, shot: 'trick-labels-500-360.png' },
    { variant: '500' as const, width: 390, height: 844, cards: 8, shot: 'trick-labels-500-390.png' },
    { variant: '500' as const, width: 667, height: 375, cards: 8, shot: 'trick-labels-500-667x375.png' },
    { variant: '500' as const, width: 800, height: 480, cards: 8, shot: '' },
    { variant: '250' as const, width: 360, height: 740, cards: 6, shot: 'trick-labels-250-360.png' },
    { variant: '250' as const, width: 390, height: 844, cards: 6, shot: '' },
    { variant: '250' as const, width: 667, height: 375, cards: 6, shot: '' },
    { variant: '250' as const, width: 800, height: 480, cards: 6, shot: '' },
  ]) {
    test(`${view.variant} ${view.cards} cards at ${view.width}x${view.height}`, async ({ page }) => {
      await page.setViewportSize({ width: view.width, height: view.height });
      await open(page, view.variant);
      await expect(page.getByTestId('trick-seat')).toHaveCount(view.cards);
      await expectLabelsClear(page);
      if (view.shot) await saveShot(page, `/opt/cursor/artifacts/${view.shot}`, false);
    });
  }
});

async function open(page: Page, variant: '250' | '500'): Promise<void> {
  await page.goto('/play?script=labels');
  await page.getByRole('button', { name: new RegExp(`^${variant}`) }).click();
  await page.getByLabel('Your name').click();
  await page.keyboard.type('Ada');
  await page.getByTestId('start-vs-bots').click();
}

/** Every seat label is inside the felt and the viewport, and the fan does not cover it. */
async function expectLabelsClear(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const felt = document.querySelector('.bg-felt');
    const found: string[] = [];
    if (!(felt instanceof HTMLElement)) return ['missing felt'];
    const feltBox = felt.getBoundingClientRect();
    const labels = [...document.querySelectorAll('[data-testid="trick-seat"]')];
    if (labels.length === 0) return ['no labels'];
    const tops = labels.map((label) => label.getBoundingClientRect().top);
    if (Math.max(...tops) - Math.min(...tops) > 4) found.push('trick wrapped');
    labels.forEach((label, index) => {
      if (!(label instanceof HTMLElement)) return;
      const box = label.getBoundingClientRect();
      const size = Number.parseFloat(getComputedStyle(label).fontSize);
      if (size < 9) found.push(`label ${index} is ${size}px`);
      if (box.left < -0.5 || box.top < -0.5 || box.right > window.innerWidth + 0.5 || box.bottom > window.innerHeight + 0.5) found.push(`label ${index} outside the viewport`);
      if (box.left < feltBox.left - 0.5 || box.top < feltBox.top - 0.5 || box.right > feltBox.right + 0.5 || box.bottom > feltBox.bottom + 0.5) found.push(`label ${index} outside the felt`);
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      if (hit !== label && !(hit && label.contains(hit))) found.push(`label ${index} covered by ${hit?.getAttribute?.('data-testid') || hit?.tagName || 'none'}`);
    });
    return found;
  });
  expect(problems, problems.join('; ')).toEqual([]);
}
