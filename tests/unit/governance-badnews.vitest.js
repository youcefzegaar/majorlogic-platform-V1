import { describe, it, expect } from 'vitest';
import { runAll } from '../../packages/governance-evaluator/src/index.js';

const baseCtx = {
  governance: { ok: true, violations: [], warnings: [] },
  catalogTruth: { total: 5 },
  determinismProbe: { sampled: false },
};

function makeDecision(heroOverrides = {}) {
  return {
    decisionRunId: 'test-run',
    status: 'ok',
    cards: [
      {
        cardType: 'hero',
        entityId: 'e1',
        score: 85,
        badNews: null,
        explanation: { cost: { text: 'Trade-off text', severity: 'medium' }, tradeoff: { text: 'tradeoff' } },
        sacrifices: {},
        bestOffer: { isAffiliate: false },
        ...heroOverrides,
      },
      {
        cardType: 'runner_up',
        entityId: 'e2',
        score: 78,
        badNews: null,
        explanation: { cost: { text: 'some trade', severity: 'low' }, tradeoff: { text: 'minor' } },
        sacrifices: {},
        bestOffer: { isAffiliate: false },
      },
    ],
  };
}

describe('bad-news-integrity guard', () => {
  it('(a) gate_violation present + real badNews → passes', () => {
    const decision = makeDecision({
      sacrifices: {
        within_budget: { type: 'gate_violation', severity: 1.0, meaning: 'Budget constraint' },
      },
      badNews: 'This laptop exceeds your stated budget — you must consciously accept a higher price.',
    });

    const cert = runAll(decision, null, baseCtx);
    const guard = cert.guardsMap['bad-news-integrity'];

    expect(guard.passed).toBe(true);
    expect(guard.evidence.gateViolations).toBe(1);
  });

  it('(b) gate_violation present + missing badNews → fails', () => {
    const decision = makeDecision({
      sacrifices: {
        within_budget: { type: 'gate_violation', severity: 1.0, meaning: 'Budget constraint' },
      },
      badNews: null,
    });

    const cert = runAll(decision, null, baseCtx);
    const guard = cert.guardsMap['bad-news-integrity'];

    expect(guard.passed).toBe(false);
    expect(guard.evidence.gateViolations).toBe(1);
    expect(guard.evidence.badNewsPresent).toBe(false);
  });

  it('(b2) gate_violation present + synthetic badNews → fails', () => {
    const decision = makeDecision({
      sacrifices: {
        within_budget: { type: 'gate_violation', severity: 1.0, meaning: 'Budget constraint' },
      },
      badNews: 'No significant trade-off was found.',
    });

    const cert = runAll(decision, null, baseCtx);
    const guard = cert.guardsMap['bad-news-integrity'];

    expect(guard.passed).toBe(false);
    expect(guard.evidence.badNewsSynthetic).toBe(true);
  });

  it('(c) no gate_violation → passes with gateViolations === 0', () => {
    const decision = makeDecision({
      sacrifices: {
        battery: { type: 'soft_sacrifice', severity: 0.3, meaning: 'Battery below priority' },
      },
      badNews: null,
    });

    const cert = runAll(decision, null, baseCtx);
    const guard = cert.guardsMap['bad-news-integrity'];

    expect(guard.passed).toBe(true);
    expect(guard.evidence.gateViolations).toBe(0);
  });
});
