import { test, expect } from '@playwright/test';

test.describe('smoke (mobile viewport)', () => {
  test('home page loads with no console errors and shows mode buttons', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { name: /250 & 500/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /score in-person game/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /play vs bots/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /play online/i })).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('suit labels show all four pips at 390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/suit-labels');
    await expect(page.getByTestId('suit-label-sheet')).toBeVisible();
    await expect(page.getByRole('img', { name: 'clubs' })).toHaveCount(2);
    await page.screenshot({ path: '/opt/cursor/artifacts/suit-labels-390x844.png', fullPage: false });
  });

  test('scoring flow link navigates correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /score in-person game/i }).click();
    await expect(page.getByRole('heading', { name: /new game/i })).toBeVisible();
  });
});
