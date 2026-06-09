/**
 * HTTP integration tests for the API layer.
 *
 * Strategy: build a minimal Fastify instance (no DB, no JWT, no admin auth),
 * register only the API routes, and use fastify.inject() to exercise the
 * HTTP layer end-to-end — schema validation, routing, domain checks, and
 * response shapes.
 *
 * The domain controller and repository are stubbed so tests are fully
 * in-memory and require no external infrastructure.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';

// ── Minimal stub controller ───────────────────────────────────────────────────
const STUB_PIPELINE_RESULT = {
  schemaVersion: 2,
  domain: { domainId: 'laptop-student-us' },
  governance: { ok: true, violations: [], warnings: [] },
  decision: {
    decisionRunId: 'test-run-id',
    status: 'ok',
    cards: [
      {
        entityId: 'e1',
        cardType: 'hero',
        title: 'Test Laptop',
        score: 85,
        priceUsd: 999,
        explanation: { cost: { text: 'heavy', severity: 'medium' }, tradeoff: { text: 'tradeoff' } },
      },
    ],
  },
  integrityCertificate: {
    overallPassed: true,
    integrityScore: 100,
    guards: [],
    guardsMap: {},
    decisionRunId: 'test-run-id',
    evaluatedAt: new Date().toISOString(),
  },
};

// ── Stub repository ───────────────────────────────────────────────────────────
const stubRepo = {
  saveTelemetryClick: vi.fn().mockResolvedValue(undefined),
  saveGrowthLead:     vi.fn().mockResolvedValue({ id: 'lead-1', isDuplicate: false }),
  getPublishedEntities: vi.fn().mockResolvedValue([]),
};

// ── Mock registry + db modules ────────────────────────────────────────────────
vi.mock('../../apps/api/src/registry.js', () => ({
  getValidDomains: () => new Set(['laptop-student-us']),
  getDomainController: (domain) => {
    if (domain !== 'laptop-student-us') throw new Error(`Domain not found: ${domain}`);
    return { runPipeline: vi.fn().mockResolvedValue(STUB_PIPELINE_RESULT) };
  },
}));

vi.mock('../../apps/api/src/db/repository.js', () => ({
  getRepository: vi.fn().mockResolvedValue(stubRepo),
}));

// ── Email service stub (fire-and-forget — don't let it throw) ────────────────
vi.mock('../../packages/email-service/src/index.js', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

// ── Monitoring stub ───────────────────────────────────────────────────────────
vi.mock('../../apps/api/src/monitoring/telegram.js', () => ({
  sendTelegramAlert: vi.fn(),
}));

// ── Build test server ─────────────────────────────────────────────────────────
let fastify;

beforeAll(async () => {
  fastify = Fastify({ logger: false });

  // Rate-limit plugin (required by growth/jobs routes)
  await fastify.register(import('@fastify/rate-limit'), { global: false });

  // Cookie plugin (required by feedback routes)
  await fastify.register(import('@fastify/cookie'), {
    secret: 'test-cookie-secret-32-chars-long!!',
  });

  // Register API routes under the /api/v1 prefix
  const { default: apiRoutes } = await import('../../apps/api/src/routes/api/index.js');
  await fastify.register(apiRoutes, { prefix: '/api/v1', isProd: false });

  await fastify.ready();
});

afterAll(async () => {
  await fastify.close();
});

// ── /health ───────────────────────────────────────────────────────────────────

describe('GET /api/v1/health', () => {
  it('returns 200 with ok:true', async () => {
    const res = await fastify.inject({ method: 'GET', url: '/api/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe('majorlogic-api');
  });
});

// ── POST /decision/run ────────────────────────────────────────────────────────

describe('POST /api/v1/:domain/decision/run', () => {
  const validBody = { major: 'cs', budgetUsd: 1200 };

  it('returns 200 with cards array for a valid domain + body', async () => {
    const res = await fastify.inject({
      method: 'POST',
      url:    '/api/v1/laptop-student-us/decision/run',
      payload: validBody,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.decision.cards)).toBe(true);
    expect(body.schemaVersion).toBe(2);
  });

  it('returns 400 for an unknown domain', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/unknown-domain/decision/run',
      payload: validBody,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_domain');
  });

  it('returns 400 when required field "major" is missing', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/decision/run',
      payload: { budgetUsd: 800 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when required field "budgetUsd" is missing', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/decision/run',
      payload: { major: 'cs' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when budgetUsd is below minimum (100)', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/decision/run',
      payload: { major: 'cs', budgetUsd: 50 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when budgetUsd is above maximum (20000)', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/decision/run',
      payload: { major: 'cs', budgetUsd: 99999 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('accepts optional fields (preferences, locale) without errors', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/decision/run',
      payload: {
        major:       'cs',
        budgetUsd:   1500,
        locale:      'en',
        preferences: { performance: 8, battery: 6 },
      },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── POST /telemetry/click ─────────────────────────────────────────────────────

describe('POST /api/v1/:domain/telemetry/click', () => {
  it('returns 200 when decisionRunId and entityId are provided', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/telemetry/click',
      payload: { decisionRunId: 'run-1', entityId: 'e1' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('returns 400 when decisionRunId is missing', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/telemetry/click',
      payload: { entityId: 'e1' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when entityId is missing', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/telemetry/click',
      payload: { decisionRunId: 'run-1' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for an invalid domain', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/invalid-domain/telemetry/click',
      payload: { decisionRunId: 'run-1', entityId: 'e1' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_domain');
  });
});

// ── POST /growth/lead ─────────────────────────────────────────────────────────

describe('POST /api/v1/:domain/growth/lead', () => {
  const validLead = { email: 'test@example.com', leadType: 'save_results' };

  it('returns 200 when email and leadType are valid', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/growth/lead',
      payload: validLead,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it('returns 400 when email is missing', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/growth/lead',
      payload: { leadType: 'save_results' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid leadType', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/growth/lead',
      payload: { email: 'x@x.com', leadType: 'invalid_type' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_lead_type');
  });

  it('returns 400 for a malformed email', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/laptop-student-us/growth/lead',
      payload: { email: 'not-an-email', leadType: 'save_results' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_email_format');
  });

  it('returns 400 for an invalid domain', async () => {
    const res = await fastify.inject({
      method:  'POST',
      url:     '/api/v1/bad-domain/growth/lead',
      payload: validLead,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_domain');
  });
});
