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
    await expect(page.getByRole('button', { name: /play online/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /play online/i })).toBeDisabled();

    expect(consoleErrors).toHaveLength(0);
  });

  test('scoring flow link navigates correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /score in-person game/i }).click();
    await expect(page.getByRole('heading', { name: /scorekeeper/i })).toBeVisible();
  });
});
