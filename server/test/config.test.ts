import { describe, expect, it } from 'vitest';
import { loadEnv, requireClerk, resetEnvCache } from '../src/config.js';

describe('config.loadEnv', () => {
  it('applies defaults when optional vars are absent', () => {
    resetEnvCache();
    const env = loadEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.SESSION_SIZE).toBe(10);
    expect(env.GRADING_FAST_MS).toBe(4000);
    expect(env.GRADING_SLOW_MS).toBe(12000);
  });

  it('coerces numeric vars from strings', () => {
    resetEnvCache();
    const env = loadEnv({ PORT: '8080', SESSION_SIZE: '5' });
    expect(env.PORT).toBe(8080);
    expect(env.SESSION_SIZE).toBe(5);
  });

  it('rejects an invalid NODE_ENV', () => {
    resetEnvCache();
    expect(() => loadEnv({ NODE_ENV: 'staging' })).toThrow(/Invalid environment/);
  });

  it('requireClerk throws when keys are missing', () => {
    resetEnvCache();
    const env = loadEnv({});
    expect(() => requireClerk(env)).toThrow(/CLERK_/);
  });

  it('requireClerk returns keys when present', () => {
    resetEnvCache();
    const env = loadEnv({
      CLERK_PUBLISHABLE_KEY: 'pk_test',
      CLERK_SECRET_KEY: 'sk_test',
    });
    expect(requireClerk(env)).toEqual({
      publishableKey: 'pk_test',
      secretKey: 'sk_test',
    });
  });
});
