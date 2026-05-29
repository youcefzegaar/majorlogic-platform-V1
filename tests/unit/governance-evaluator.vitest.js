import { describe, it, expect } from 'vitest';
import { runAll } from '../../packages/governance-evaluator/src/index.js';

// Helper: build a minimal valid decision
function makeDecision({ heroHasCost = true, heroHasTradeoff = true, cards = null } = {}) {
  const hero = {
    cardType: 'hero',
    entityId: 'laptop-a',
    score: 85,
    irHash: 'abc123',
    bestOffer: { priceUsd: 800, isAffiliate: false },
    traceScores: { performance_score: 80, portability_score: 70 },
    explanation: {
      cost: heroHasCost ? { text: 'Heavy at 2.1kg' } : null,
      tradeoff: heroHasTradeoff ? { text: 'You traded portability for performance' } : null,
    },
  };
  return {
    decisionRunId: 'test-run-id',
    cards: cards ?? [
      hero,
      { cardType: 'alternative', entityId: 'laptop-b', score: 78, bestOffer: { priceUsd: 700, isAffiliate: false }, traceScores: {}, explanation: { cost: null, tradeoff: null } },
      { cardType: 'alternative', entityId: 'laptop-c', score: 72, bestOffer: { priceUsd: 650, isAffiliate: false }, traceScores: {}, explanation: { cost: null, tradeoff: null } },
    ],
  };
}

// Valid ctx for tests that don't target a specific guard
const validCtx = {
  governance: { ok: true, violations: [], warnings: [] },
  catalogTruth: { total: 5 },
};

describe('governance-evaluator', () => {
  it('all guards pass on a valid decision', () => {
    const decision = makeDecision();
    const cert = runAll(decision, null, validCtx);

    expect(cert.overallPassed).toBe(true);
    expect(cert.integrityScore).toBe(100);
    expect(cert.guards.every(g => g.passed)).toBe(true);
    expect(cert.decisionRunId).toBe('test-run-id');
    expect(typeof cert.evaluatedAt).toBe('string');
  });

  it('sacrifice guard fails when hero has no tradeoff (permanent M1 guarantee)', () => {
    const decision = makeDecision({ heroHasTradeoff: false });
    const cert = runAll(decision, null, validCtx);

    const sacrificeGuard = cert.guards.find(g => g.id === 'sacrifice');
    expect(sacrificeGuard.passed).toBe(false);
    expect(sacrificeGuard.evidence.tradeoffPresent).toBe(false);
    expect(cert.overallPassed).toBe(false);
    expect(cert.integrityScore).toBeLessThan(100);
  });

  it('money-separation guard fails when affiliate cards are ranked higher than non-affiliate', () => {
    // Affiliate cards at ranks 1 and 2, non-affiliate at rank 3 → positive correlation
    const cards = [
      { cardType: 'hero', entityId: 'a', score: 90, bestOffer: { isAffiliate: true }, traceScores: {}, explanation: { cost: {}, tradeoff: {} } },
      { cardType: 'alt', entityId: 'b', score: 80, bestOffer: { isAffiliate: true }, traceScores: {}, explanation: { cost: null, tradeoff: null } },
      { cardType: 'alt', entityId: 'c', score: 60, bestOffer: { isAffiliate: false }, traceScores: {}, explanation: { cost: null, tradeoff: null } },
    ];
    const decision = makeDecision({ cards });
    const cert = runAll(decision, null, validCtx);

    const moneyGuard = cert.guards.find(g => g.id === 'money-separation');
    expect(moneyGuard.passed).toBe(false);
    expect(moneyGuard.evidence.affiliateCardCount).toBe(2);
    expect(moneyGuard.evidence.spearmanCorrelation).toBeGreaterThan(0.3);
  });

  it('governance-drift guard fails when governance violations exist', () => {
    const decision = makeDecision();
    const cert = runAll(decision, null, {
      ...validCtx,
      governance: { ok: false, violations: ['Platform drift: missing domainId'], warnings: [] },
    });

    const driftGuard = cert.guards.find(g => g.id === 'governance-drift');
    expect(driftGuard.passed).toBe(false);
    expect(driftGuard.evidence.violations).toHaveLength(1);
  });

  it('catalog-truth guard fails when fewer than 3 entities are published', () => {
    const decision = makeDecision();
    const cert = runAll(decision, null, {
      ...validCtx,
      catalogTruth: { total: 1 },
    });

    const catalogGuard = cert.guards.find(g => g.id === 'catalog-truth');
    expect(catalogGuard.passed).toBe(false);
    expect(catalogGuard.evidence.publishedEntityCount).toBe(1);
    expect(cert.overallPassed).toBe(false);
  });

  it('sacrifice guard fails when cost/tradeoff text is synthetic (C2 — content check)', () => {
    // Simulates what buildExplanation returns when trace.sacrifices is empty
    const syntheticDecision = makeDecision({ cards: [
      {
        cardType: 'hero', entityId: 'x', score: 80,
        bestOffer: { isAffiliate: false }, traceScores: {},
        explanation: {
          cost:     { text: 'Our data did not surface a dominant trade-off — verify the details that matter to you before committing.', severity: 'none' },
          tradeoff: { text: 'Our data did not surface a prominent weakness — verify the details that matter to you.', severity: 'none' },
        },
      },
      { cardType: 'alt', entityId: 'y', score: 70, bestOffer: { isAffiliate: false }, traceScores: {}, explanation: { cost: null, tradeoff: null } },
    ]});
    const cert = runAll(syntheticDecision, null, validCtx);
    const sacrificeGuard = cert.guards.find(g => g.id === 'sacrifice');
    expect(sacrificeGuard.passed).toBe(false);
    expect(sacrificeGuard.evidence.costSynthetic).toBe(true);
    expect(cert.overallPassed).toBe(false);
  });

  it('integrityScore is computed correctly from severity weights', () => {
    // 5 guards: sacrifice=critical(40), money-sep=critical(40), drift=high(20),
    //           catalog-truth=high(20), determinism=high(20) → total = 140
    // When only drift fails: earned = 40+40+20+20 = 120 → score = 86%
    const decision = makeDecision();
    const cert = runAll(decision, null, {
      ...validCtx,
      governance: { ok: false, violations: ['drift'], warnings: [] },
    });

    expect(cert.integrityScore).toBe(86);
    expect(cert.guardsMap).toHaveProperty('governance-drift');
    expect(cert.guardsMap).toHaveProperty('catalog-truth');
    expect(cert.guardsMap).toHaveProperty('sacrifice');
    expect(cert.guardsMap).toHaveProperty('money-separation');
    expect(cert.guardsMap).toHaveProperty('determinism');
  });

  it('determinism guard: passes optimistically when not sampled (sampled: false)', () => {
    const decision = makeDecision();
    const cert = runAll(decision, null, validCtx); // no determinismProbe in ctx

    const detGuard = cert.guards.find(g => g.id === 'determinism');
    expect(detGuard.passed).toBe(true);
    expect(detGuard.evidence.sampled).toBe(false);
    expect(detGuard.evidence.irHashInfrastructureActive).toBe(true); // hero has irHash:'abc123'
  });

  it('determinism guard: fails when sampled probe shows irHash missing', () => {
    const decision = makeDecision();
    const cert = runAll(decision, null, {
      ...validCtx,
      determinismProbe: { sampled: true, irHashPresent: false, irHash: null },
    });

    const detGuard = cert.guards.find(g => g.id === 'determinism');
    expect(detGuard.passed).toBe(false);
    expect(detGuard.evidence.sampled).toBe(true);
    expect(detGuard.evidence.irHashPresent).toBe(false);
    expect(cert.overallPassed).toBe(false);
  });
});
