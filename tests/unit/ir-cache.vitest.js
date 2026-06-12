import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  _irCacheSize,
  irCacheStats,
  narrativeCacheStats,
  IR_CACHE_MAX_SIZE,
  IR_CACHE_TTL_MS,
  DecisionOrchestrator,
} from '../../packages/decision-orchestrator/src/index.js';

// Minimal decision config for cache key tests
const makeConfig = (domainId, version = '1.0') => ({
  domainId,
  version,
  profileMapping: {},
  gates: {},
  scores: { general: { weights: { score: 1 }, isFinal: true } },
  selectionStrategy: { cardSlots: [{ type: 'hero', pickBy: 'score' }], noDuplicates: true },
});

const minCatalog = [{ entityId: 'A', name: 'A', priceUsd: 100, score: 80 }];
const minProfile = { budget: 200 };

describe('IR Cache', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new DecisionOrchestrator({
      logger: { log: () => {}, warn: () => {}, error: () => {} },
    });
  });

  it('irCacheStats() returns an object with expected keys', () => {
    const stats = irCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize', IR_CACHE_MAX_SIZE);
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('hitRate');
  });

  it('hitRate is a percentage string', () => {
    const { hitRate } = irCacheStats();
    expect(hitRate).toMatch(/^\d+\.\d{2}%$/);
  });

  it('running the same config twice increments hits', async () => {
    const config = makeConfig('ir-cache-test-domain', '2.0');
    const before = irCacheStats();

    await orchestrator.run(config, minCatalog, minProfile);
    const afterFirst = irCacheStats();

    await orchestrator.run(config, minCatalog, minProfile);
    const afterSecond = irCacheStats();

    // First run = miss, second run = hit (same cacheKey)
    expect(afterFirst.misses).toBeGreaterThan(before.misses);
    expect(afterSecond.hits).toBeGreaterThan(afterFirst.hits);
  });

  it('different domainId produces a cache miss', async () => {
    const configA = makeConfig('domain-alpha-test', '1.0');
    const configB = makeConfig('domain-beta-test',  '1.0');

    await orchestrator.run(configA, minCatalog, minProfile);
    const before = irCacheStats();

    await orchestrator.run(configB, minCatalog, minProfile);
    const after = irCacheStats();

    expect(after.misses).toBeGreaterThan(before.misses);
  });

  it('IR_CACHE_TTL_MS is 30 minutes', () => {
    expect(IR_CACHE_TTL_MS).toBe(30 * 60 * 1000);
  });

  it('IR_CACHE_MAX_SIZE is 50', () => {
    expect(IR_CACHE_MAX_SIZE).toBe(50);
  });

  it('_irCacheSize() returns a non-negative integer', () => {
    expect(_irCacheSize()).toBeGreaterThanOrEqual(0);
  });
});

describe('NarrativeCache stats', () => {
  it('narrativeCacheStats() returns an object with expected keys', () => {
    const stats = narrativeCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('hitRate');
  });

  it('hitRate is a percentage string', () => {
    const { hitRate } = narrativeCacheStats();
    expect(hitRate).toMatch(/^\d+\.\d{2}%$/);
  });
});
