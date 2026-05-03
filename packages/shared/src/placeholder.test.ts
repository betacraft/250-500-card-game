import { describe, it, expect } from 'vitest';
import { healthSchema } from './placeholder';

describe('healthSchema', () => {
  it('accepts a valid health payload', () => {
    const result = healthSchema.safeParse({
      status: 'ok',
      timestamp: '2026-05-03T12:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing fields', () => {
    const result = healthSchema.safeParse({ status: 'ok' });
    expect(result.success).toBe(false);
  });

  it('rejects wrong status value', () => {
    const result = healthSchema.safeParse({
      status: 'down',
      timestamp: '2026-05-03T12:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });
});
