import { describe, it, expect } from 'vitest';
import { loadConfig } from './config';

describe('config', () => {
  it('uses defaults when env empty', () => {
    const c = loadConfig({});
    expect(c.PORT).toBe(3001);
    expect(c.NODE_ENV).toBe('development');
  });

  it('parses PORT as number', () => {
    const c = loadConfig({ PORT: '8080' });
    expect(c.PORT).toBe(8080);
  });

  it('rejects out-of-range PORT', () => {
    expect(() => loadConfig({ PORT: '99999' })).toThrow();
  });

  it('rejects invalid NODE_ENV', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow();
  });

  it('warns but does NOT throw on production with CORS_ORIGIN=*', () => {
    // Capture stderr to verify the warning is emitted
    const origWrite = process.stderr.write.bind(process.stderr);
    let captured = '';
    process.stderr.write = ((chunk: string | Uint8Array) => {
      captured += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      const c = loadConfig({ NODE_ENV: 'production' });
      expect(c.CORS_ORIGIN).toBe('*');
      expect(captured).toMatch(/CORS_ORIGIN.*production/i);
    } finally {
      process.stderr.write = origWrite;
    }
  });

  it('accepts production with explicit CORS_ORIGIN', () => {
    const c = loadConfig({ NODE_ENV: 'production', CORS_ORIGIN: 'https://app.example.com' });
    expect(c.CORS_ORIGIN).toBe('https://app.example.com');
  });
});
