import { describe, expect, it } from 'vitest';
import { TOAST_BACKGROUND, TOAST_TEXT, contrastRatio } from './toast-contrast';

describe('reveal toast contrast', () => {
  it('keeps the gold pill and its text at 4.5:1 or better', () => {
    expect(contrastRatio(TOAST_TEXT, TOAST_BACKGROUND)).toBeGreaterThanOrEqual(4.5);
  });
});
