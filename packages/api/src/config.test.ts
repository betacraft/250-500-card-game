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
});
