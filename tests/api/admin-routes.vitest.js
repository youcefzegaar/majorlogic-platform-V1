/**
 * admin-routes.vitest.js
 *
 * Module-level smoke tests for the split admin route plugins.
 * No Fastify server is started — only import shapes are verified.
 */

import { describe, it, expect } from 'vitest';

describe('Admin sub-plugin exports — each is a function', () => {
  it('auth plugin default export is a function', async () => {
    const mod = await import('../../apps/api/src/routes/admin/auth.js');
    expect(typeof mod.default).toBe('function');
  });

  it('dashboard plugin default export is a function', async () => {
    const mod = await import('../../apps/api/src/routes/admin/dashboard.js');
    expect(typeof mod.default).toBe('function');
  });

  it('integrations plugin default export is a function', async () => {
    const mod = await import('../../apps/api/src/routes/admin/integrations.js');
    expect(typeof mod.default).toBe('function');
  });

  it('settings plugin default export is a function', async () => {
    const mod = await import('../../apps/api/src/routes/admin/settings.js');
    expect(typeof mod.default).toBe('function');
  });

  it('catalog plugin default export is a function', async () => {
    const mod = await import('../../apps/api/src/routes/admin/catalog.js');
    expect(typeof mod.default).toBe('function');
  });

  it('ownership plugin default export is a function', async () => {
    const mod = await import('../../apps/api/src/routes/admin/ownership.js');
    expect(typeof mod.default).toBe('function');
  });
});

describe('Admin index — AUDIT_ACTIONS and getAuditAction', () => {
  it('AUDIT_ACTIONS is a non-empty array', async () => {
    const { AUDIT_ACTIONS } = await import('../../apps/api/src/routes/admin/index.js');
    expect(Array.isArray(AUDIT_ACTIONS)).toBe(true);
    expect(AUDIT_ACTIONS.length).toBeGreaterThan(0);
  });

  it('getAuditAction returns "login" for POST /admin/login', async () => {
    const { getAuditAction } = await import('../../apps/api/src/routes/admin/index.js');
    expect(getAuditAction('POST', '/admin/login')).toBe('login');
  });

  it('getAuditAction returns "logout" for GET /admin/logout', async () => {
    const { getAuditAction } = await import('../../apps/api/src/routes/admin/index.js');
    expect(getAuditAction('GET', '/admin/logout')).toBe('logout');
  });

  it('getAuditAction returns null for unknown routes', async () => {
    const { getAuditAction } = await import('../../apps/api/src/routes/admin/index.js');
    expect(getAuditAction('GET', '/admin/unknown-route')).toBeNull();
  });
});
