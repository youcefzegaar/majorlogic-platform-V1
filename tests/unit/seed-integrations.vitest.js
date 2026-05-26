/**
 * seed-integrations.vitest.js
 *
 * Unit tests for CommercialRepository.seedDefaultIntegrations().
 * Uses a mock pool so no real database is required.
 *
 * The method inserts 14 default integrations with ON CONFLICT DO NOTHING
 * (idempotent), then returns the full integration list from the DB.
 */

import { describe, it, expect } from 'vitest';
import { CommercialRepository } from '../../packages/postgres-persistence/src/repositories/commercial.js';

const EXPECTED_SLUGS = [
  'claude', 'openai', 'gemini',
  'amazon_pa', 'sendgrid', 'resend', 'slack_webhook',
  'reddit', 'youtube', 'bestbuy', 'google_search', 'serpapi',
  'redis', 'postgres_read',
];

function makeMockPool(seedRows) {
  const calls = [];
  return {
    calls,
    query: async (sql) => {
      calls.push(sql.trim().slice(0, 80)); // record first 80 chars for assertions
      // First call = INSERT (seed), second call = SELECT (getIntegrations)
      if (calls.length === 1) return { rows: [] };
      return { rows: seedRows };
    }
  };
}

const MOCK_ROWS = EXPECTED_SLUGS.map((slug, i) => ({
  id: i + 1,
  slug,
  category: 'test',
  name: slug,
  description: '',
  icon_emoji: '🔧',
  config: {},
  credentials: {},     // empty → decryptCredentials returns {} without ENCRYPTION_KEY
  is_active: true,
  last_tested_at: null,
  last_test_ok: null,
  updated_at: null,
}));

describe('CommercialRepository.seedDefaultIntegrations()', () => {
  it('executes exactly two pool.query calls (INSERT + SELECT)', async () => {
    const pool = makeMockPool(MOCK_ROWS);
    const repo = new CommercialRepository(pool);
    await repo.seedDefaultIntegrations();
    expect(pool.calls).toHaveLength(2);
  });

  it('first query is an INSERT INTO platform_integrations', async () => {
    const pool = makeMockPool(MOCK_ROWS);
    const repo = new CommercialRepository(pool);
    await repo.seedDefaultIntegrations();
    expect(pool.calls[0].toLowerCase()).toContain('insert into');
    expect(pool.calls[0].toLowerCase()).toContain('platform_integrations');
  });

  it('INSERT uses ON CONFLICT DO NOTHING (idempotent)', async () => {
    let insertSql = '';
    const pool = {
      query: async (sql) => {
        if (!insertSql) insertSql = sql;
        return { rows: MOCK_ROWS };
      }
    };
    const repo = new CommercialRepository(pool);
    await repo.seedDefaultIntegrations();
    expect(insertSql.toLowerCase()).toContain('on conflict');
    expect(insertSql.toLowerCase()).toContain('do nothing');
  });

  it('INSERT includes all 14 expected integration slugs', async () => {
    let insertSql = '';
    const pool = {
      query: async (sql) => {
        if (!insertSql) insertSql = sql;
        return { rows: MOCK_ROWS };
      }
    };
    const repo = new CommercialRepository(pool);
    await repo.seedDefaultIntegrations();
    for (const slug of EXPECTED_SLUGS) {
      expect(insertSql).toContain(`'${slug}'`);
    }
  });

  it('returns an array with one entry per seeded integration', async () => {
    const pool = makeMockPool(MOCK_ROWS);
    const repo = new CommercialRepository(pool);
    const result = await repo.seedDefaultIntegrations();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(EXPECTED_SLUGS.length);
  });

  it('each returned integration has has_credentials: false when credentials are empty', async () => {
    const pool = makeMockPool(MOCK_ROWS);
    const repo = new CommercialRepository(pool);
    const result = await repo.seedDefaultIntegrations();
    for (const integration of result) {
      expect(integration.has_credentials).toBe(false);
    }
  });

  it('each returned integration has a slug matching the original seed', async () => {
    const pool = makeMockPool(MOCK_ROWS);
    const repo = new CommercialRepository(pool);
    const result = await repo.seedDefaultIntegrations();
    const returnedSlugs = result.map(r => r.slug).sort();
    expect(returnedSlugs).toEqual([...EXPECTED_SLUGS].sort());
  });

  it('is safe to call a second time (idempotency — no throw on conflict)', async () => {
    const pool = makeMockPool(MOCK_ROWS);
    const repo = new CommercialRepository(pool);
    await expect(repo.seedDefaultIntegrations()).resolves.not.toThrow();
    await expect(repo.seedDefaultIntegrations()).resolves.not.toThrow();
  });
});
