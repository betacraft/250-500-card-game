import { describe, it, expect } from 'vitest';
import { generateRoomCode, generateUniqueRoomCode } from './room-codes';

describe('room-codes', () => {
  it('produces 6-char codes', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    }
  });

  it('avoids ambiguous characters (no 0, 1, I, O)', () => {
    const codes = Array.from({ length: 1000 }, () => generateRoomCode()).join('');
    expect(codes).not.toMatch(/[01IO]/);
  });

  it('generates many unique codes (statistical)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) seen.add(generateRoomCode());
    expect(seen.size).toBeGreaterThan(9_900);
  });

  it('generateUniqueRoomCode avoids existing', () => {
    const existing = new Set(['ABCDEF']);
    const code = generateUniqueRoomCode(existing);
    expect(code).not.toBe('ABCDEF');
  });
});
