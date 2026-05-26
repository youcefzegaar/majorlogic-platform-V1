import { describe, it, expect } from 'vitest';

// ── Health plugin ──────────────────────────────────────────────────────────────

describe('API Health Routes', () => {
  it('health plugin module exists and exports a function', async () => {
    const mod = await import('../../apps/api/src/plugins/health.js');
    expect(typeof mod.default).toBe('function');
  });
});

// ── Registry / domain whitelist ────────────────────────────────────────────────

describe('Domain Registry', () => {
  it('getValidDomains() returns a non-empty Set', async () => {
    const { getValidDomains } = await import('../../apps/api/src/registry.js');
    const domains = getValidDomains();
    expect(domains).toBeInstanceOf(Set);
    expect(domains.size).toBeGreaterThan(0);
  });

  it('getValidDomains() contains the default domain "laptop-student-us"', async () => {
    const { getValidDomains } = await import('../../apps/api/src/registry.js');
    expect(getValidDomains().has('laptop-student-us')).toBe(true);
  });

  it('getValidDomains() does not contain fabricated domain names', async () => {
    const { getValidDomains } = await import('../../apps/api/src/registry.js');
    expect(getValidDomains().has('__injected__')).toBe(false);
    expect(getValidDomains().has('')).toBe(false);
    expect(getValidDomains().has('../etc/passwd')).toBe(false);
  });

  it('getValidDomains() is stable across multiple calls (same values)', async () => {
    const { getValidDomains } = await import('../../apps/api/src/registry.js');
    const first  = [...getValidDomains()].sort();
    const second = [...getValidDomains()].sort();
    expect(first).toEqual(second);
  });
});

// ── validate-env ───────────────────────────────────────────────────────────────

describe('Environment validator module', () => {
  it('validate-env module exports a validateEnv function', async () => {
    const mod = await import('../../apps/api/src/config/validate-env.js');
    expect(typeof mod.validateEnv).toBe('function');
  });
});

// ── utils/errors.js ────────────────────────────────────────────────────────────

describe('Error factory utilities', () => {
  it('badRequest returns statusCode 400', async () => {
    const { badRequest } = await import('../../apps/api/src/utils/errors.js');
    expect(badRequest('msg').statusCode).toBe(400);
  });

  it('notFound body.error defaults to "not_found"', async () => {
    const { notFound } = await import('../../apps/api/src/utils/errors.js');
    expect(notFound('msg').body.error).toBe('not_found');
  });

  it('conflict returns statusCode 409', async () => {
    const { conflict } = await import('../../apps/api/src/utils/errors.js');
    expect(conflict('msg').statusCode).toBe(409);
  });

  it('serverError returns statusCode 500', async () => {
    const { serverError } = await import('../../apps/api/src/utils/errors.js');
    expect(serverError('msg').statusCode).toBe(500);
  });

  it('unavailable returns statusCode 503', async () => {
    const { unavailable } = await import('../../apps/api/src/utils/errors.js');
    expect(unavailable('msg').statusCode).toBe(503);
  });

  it('custom code overrides the default error code', async () => {
    const { badRequest } = await import('../../apps/api/src/utils/errors.js');
    expect(badRequest('msg', 'unknown_domain').body.error).toBe('unknown_domain');
  });

  it('isPermanentFailure returns true for Postgres unique_violation (23505)', async () => {
    const { isPermanentFailure } = await import('../../apps/api/src/utils/errors.js');
    expect(isPermanentFailure({ code: '23505' })).toBe(true);
  });

  it('isPermanentFailure returns false for non-constraint error code', async () => {
    const { isPermanentFailure } = await import('../../apps/api/src/utils/errors.js');
    expect(isPermanentFailure({ code: '99999' })).toBe(false);
  });

  it('isPermanentFailure returns false for null input', async () => {
    const { isPermanentFailure } = await import('../../apps/api/src/utils/errors.js');
    expect(isPermanentFailure(null)).toBe(false);
  });
});
