import { describe, it, expect, vi } from 'vitest';
import { buildCard } from '../../packages/decision-orchestrator/src/card-builder.js';

const fakeExplainer = {
  explain: vi.fn().mockResolvedValue({ story: 'story', tradeoff: 'tradeoff', badNews: null }),
  explainTradeoff: vi.fn().mockReturnValue('tradeoff'),
};
const fakeCache = { get: vi.fn().mockReturnValue(null), set: vi.fn(), stats: vi.fn().mockReturnValue({ hitRate: '0%' }) };
const fakeLogger = { log: vi.fn() };

const baseKernel = { entityId: 'e1', score: 80, eligible: true, trace: { sacrifices: {}, scores: {} } };
const baseDomainCtx = { locale: 'en', atlas: {}, intent: { id: 'general' }, _cacheKeys: { irHash: 'h1', inputHash: 'h2' } };
const baseTemplate = {};

describe('card-builder priceCapturedAt propagation', () => {
  it('uses market.bestOffer.capturedAt when present', async () => {
    const entity = {
      title: 'Laptop A',
      publishedAt: '2026-05-01T00:00:00.000Z',
      market: { bestOffer: { priceUsd: 999, capturedAt: '2026-06-01T00:00:00.000Z' } },
      specs: {},
    };
    const card = await buildCard('hero', baseKernel, entity, baseTemplate, {}, {}, baseDomainCtx, { explainer: fakeExplainer, narrativeCache: fakeCache, logger: fakeLogger });
    expect(card.priceCapturedAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('falls back to entity.publishedAt when no capturedAt', async () => {
    const entity = {
      title: 'Laptop B',
      publishedAt: '2026-05-28T00:00:00.000Z',
      market: { bestOffer: { priceUsd: 799 } },
      specs: {},
    };
    const card = await buildCard('hero', baseKernel, entity, baseTemplate, {}, {}, baseDomainCtx, { explainer: fakeExplainer, narrativeCache: fakeCache, logger: fakeLogger });
    expect(card.priceCapturedAt).toBe('2026-05-28T00:00:00.000Z');
  });

  it('is null when neither capturedAt nor publishedAt exists', async () => {
    const entity = { title: 'Laptop C', market: { bestOffer: { priceUsd: 599 } }, specs: {} };
    const card = await buildCard('hero', baseKernel, entity, baseTemplate, {}, {}, baseDomainCtx, { explainer: fakeExplainer, narrativeCache: fakeCache, logger: fakeLogger });
    expect(card.priceCapturedAt).toBeNull();
  });
});
