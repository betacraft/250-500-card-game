import type { Page } from '@playwright/test';

/**
 * Tap Play when it is enabled.
 * Forced auto-play can detach the button between the check and the tap.
 * A missing or disabled button means the card has already left.
 */
export async function confirmPlay(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const play = page.getByTestId('confirm-play');
    if (!(await play.isVisible().catch(() => false))) return;
    if ((await play.getAttribute('aria-disabled').catch(() => 'true')) === 'true') return;
    try {
      await play.click({ timeout: 800 });
      return;
    } catch {
      // The locator can detach when auto-play takes the card first.
    }
  }
}
