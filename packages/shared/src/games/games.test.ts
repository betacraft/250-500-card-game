import { describe, it, expect } from 'vitest';
import { RULES_250, RULES_500, rulesFor } from './index';

describe('game rules', () => {
  it('250 totals to 250 points', () => {
    expect(RULES_250.TOTAL_POINTS).toBe(250);
    expect(RULES_250.PLAYER_COUNT).toBe(6);
    expect(RULES_250.PARTNERS_TO_CALL).toBe(2);
  });

  it('500 totals to 500 points', () => {
    expect(RULES_500.TOTAL_POINTS).toBe(500);
    expect(RULES_500.PLAYER_COUNT).toBe(8);
    expect(RULES_500.PARTNERS_TO_CALL).toBe(3);
  });

  it('250 cards per player x player count = total cards', () => {
    expect(RULES_250.CARDS_PER_PLAYER * RULES_250.PLAYER_COUNT).toBe(RULES_250.TOTAL_CARDS);
  });

  it('500 cards per player x player count = total cards', () => {
    expect(RULES_500.CARDS_PER_PLAYER * RULES_500.PLAYER_COUNT).toBe(RULES_500.TOTAL_CARDS);
  });

  it('rulesFor returns the right rules', () => {
    expect(rulesFor('250')).toBe(RULES_250);
    expect(rulesFor('500')).toBe(RULES_500);
  });
});
