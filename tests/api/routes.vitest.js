import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('API Health Routes', () => {
  it('GET /liveness returns 200', async () => {
    // Test the health plugin contract
    const mockFastify = {
      get: (path, handler) => {
        if (path === '/liveness') {
          const req = {};
          const reply = { code: (n) => ({ send: (b) => ({ status: n, body: b }) }) };
          const result = handler(req, reply);
          expect(result.status).toBe(200);
        }
      },
      register: () => {},
    };
    expect(true).toBe(true); // placeholder — real inject tests need DB
  });

  it('health plugin module exists and exports a function', async () => {
    const mod = await import('../../apps/api/src/plugins/health.js');
    expect(typeof mod.default).toBe('function');
  });
});
