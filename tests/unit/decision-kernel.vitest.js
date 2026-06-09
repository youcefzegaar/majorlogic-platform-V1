import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionKernel } from '../../packages/decision-kernel/src/index.js';

// Minimal IR fixture — a budget gate + a score node
function makeIR(overrides = {}) {
  return {
    id: 'test-domain',
    irHash: 'abc123',
    version: '1.0.0',
    identityRules: {},
    executionPlan: overrides.executionPlan ?? [
      {
        id: 'budget_gate',
        type: 'gate',
        condition: { op: 'gte', left: 'budget', right: 800 },
        humanMeaning: 'Budget must be at least $800',
        weight: 1.0,
        dependsOn: [],
      },
      {
        id: 'perf_score',
        type: 'score',
        weights: { performance: 0.6, battery: 0.4 },
        isFinal: true,
        dependsOn: [],
      },
    ],
  };
}

describe('DecisionKernel — execute', () => {
  let kernel;

  beforeEach(() => {
    kernel = new DecisionKernel({ log: () => {}, warn: () => {}, error: () => {} });
  });

  // ── Gate tests ────────────────────────────────────────────────────────────────

  it('entity passing the gate is eligible', () => {
    const ir = makeIR();
    const entity = { entityId: 'e1', budget: 1000, performance: 80, battery: 70 };
    const { results } = kernel.execute(ir, [entity], {});
    expect(results[0].eligible).toBe(true);
    expect(results[0].trace.exclusions).toHaveLength(0);
  });

  it('entity failing the gate is ineligible and gate id is in exclusions', () => {
    const ir = makeIR();
    const entity = { entityId: 'e2', budget: 500, performance: 90, battery: 90 };
    const { results } = kernel.execute(ir, [entity], {});
    expect(results[0].eligible).toBe(false);
    expect(results[0].trace.exclusions).toContain('budget_gate');
  });

  it('gate failure records a sacrifice entry', () => {
    const ir = makeIR();
    const entity = { entityId: 'e3', budget: 400, performance: 80, battery: 80 };
    const { results } = kernel.execute(ir, [entity], {});
    expect(results[0].trace.sacrifices['budget_gate']).toMatchObject({
      type: 'gate_violation',
    });
  });

  // ── Score tests ───────────────────────────────────────────────────────────────

  it('final score is weighted sum of metrics', () => {
    const ir = makeIR();
    // No gate — score only
    const irScoreOnly = makeIR({
      executionPlan: [
        { id: 'final', type: 'score', weights: { perf: 0.6, battery: 0.4 }, isFinal: true, dependsOn: [] },
      ],
    });
    const entity = { entityId: 'e4', perf: 100, battery: 50 };
    const { results } = kernel.execute(irScoreOnly, [entity], {});
    expect(results[0].score).toBeCloseTo(80); // 100*0.6 + 50*0.4
  });

  it('score is clamped to [0, 100]', () => {
    const irBig = makeIR({
      executionPlan: [
        { id: 's', type: 'score', weights: { v: 10 }, isFinal: true, dependsOn: [] },
      ],
    });
    const entity = { entityId: 'e5', v: 50 };
    const { results } = kernel.execute(irBig, [entity], {});
    expect(results[0].score).toBe(100); // 500 clamped to 100
  });

  it('penalty reduces score and records sacrifice', () => {
    const irPenalty = makeIR({
      executionPlan: [
        {
          id: 'scored',
          type: 'score',
          weights: { perf: 1.0 },
          penalties: {
            open_box_penalty: {
              condition: { op: 'eq', left: 'condition', right: 'open_box' },
              amount: 20,
              reason: 'Open box condition',
            },
          },
          isFinal: true,
          dependsOn: [],
        },
      ],
    });
    const entity = { entityId: 'e6', perf: 80, condition: 'open_box' };
    const { results } = kernel.execute(irPenalty, [entity], {});
    expect(results[0].score).toBeCloseTo(60); // 80 - 20
    expect(results[0].trace.sacrifices['open_box_penalty']).toMatchObject({ type: 'soft_sacrifice' });
  });

  it('penalty does NOT apply when condition is false', () => {
    const irPenalty = makeIR({
      executionPlan: [
        {
          id: 'scored',
          type: 'score',
          weights: { perf: 1.0 },
          penalties: {
            p1: {
              condition: { op: 'eq', left: 'condition', right: 'open_box' },
              amount: 20,
              reason: 'Open box',
            },
          },
          isFinal: true,
          dependsOn: [],
        },
      ],
    });
    const entity = { entityId: 'e7', perf: 80, condition: 'new' };
    const { results } = kernel.execute(irPenalty, [entity], {});
    expect(results[0].score).toBeCloseTo(80);
  });

  // ── Formula tests ─────────────────────────────────────────────────────────────

  it('derived node: add formula', () => {
    const ir = makeIR({
      executionPlan: [
        { id: 'combo', type: 'derived', formula: { op: 'add', args: ['a', 'b'] }, dependsOn: [] },
        { id: 'final', type: 'score', weights: { combo: 1.0 }, isFinal: true, dependsOn: ['combo'] },
      ],
    });
    const entity = { entityId: 'e8', a: 30, b: 40 };
    const { results } = kernel.execute(ir, [entity], {});
    expect(results[0].score).toBeCloseTo(70);
  });

  it('derived node: clamp formula', () => {
    const ir = makeIR({
      executionPlan: [
        { id: 'clamped', type: 'derived', formula: { op: 'clamp', args: ['raw', 0, 50] }, dependsOn: [] },
        { id: 'final', type: 'score', weights: { clamped: 1.0 }, isFinal: true, dependsOn: ['clamped'] },
      ],
    });
    const entity = { entityId: 'e9', raw: 200 };
    const { results } = kernel.execute(ir, [entity], {});
    expect(results[0].score).toBe(50);
  });

  it('derived node: multiply formula', () => {
    const ir = makeIR({
      executionPlan: [
        { id: 'm', type: 'derived', formula: { op: 'multiply', args: ['x', 'y'] }, dependsOn: [] },
        { id: 'final', type: 'score', weights: { m: 1.0 }, isFinal: true, dependsOn: ['m'] },
      ],
    });
    const entity = { entityId: 'e10', x: 4, y: 5 };
    const { results } = kernel.execute(ir, [entity], {});
    expect(results[0].score).toBe(20);
  });

  it('unknown formula op returns 0 safely', () => {
    const ir = makeIR({
      executionPlan: [
        { id: 'd', type: 'derived', formula: { op: 'UNKNOWN_OP', args: ['v'] }, dependsOn: [] },
        { id: 'final', type: 'score', weights: { d: 1.0 }, isFinal: true, dependsOn: ['d'] },
      ],
    });
    const entity = { entityId: 'e11', v: 99 };
    expect(() => kernel.execute(ir, [entity], {})).not.toThrow();
    const { results } = kernel.execute(ir, [entity], {});
    expect(results[0].score).toBe(0);
  });

  // ── Condition operators ───────────────────────────────────────────────────────

  it.each([
    ['gte', 10, 10, true],
    ['gte', 9,  10, false],
    ['lte', 10, 10, true],
    ['lte', 11, 10, false],
    ['gt',  11, 10, true],
    ['gt',  10, 10, false],
    ['lt',  9,  10, true],
    ['lt',  10, 10, false],
    ['eq',  5,  5,  true],
    ['eq',  5,  6,  false],
    ['ne',  5,  6,  true],
    ['ne',  5,  5,  false],
  ])('condition op=%s left=%s right=%s → eligible=%s', (op, left, right, expectedEligible) => {
    const ir = makeIR({
      executionPlan: [
        { id: 'g', type: 'gate', condition: { op, left: 'v', right }, humanMeaning: 'test', weight: 1, dependsOn: [] },
      ],
    });
    const entity = { entityId: 'ex', v: left };
    const { results } = kernel.execute(ir, [entity], {});
    expect(results[0].eligible).toBe(expectedEligible);
  });

  it('condition op=and: both must pass', () => {
    const ir = makeIR({
      executionPlan: [
        {
          id: 'and_gate',
          type: 'gate',
          condition: {
            op: 'and',
            args: [
              { op: 'gte', left: 'budget', right: 800 },
              { op: 'lte', left: 'budget', right: 2000 },
            ],
          },
          humanMeaning: 'Budget range',
          weight: 1,
          dependsOn: [],
        },
      ],
    });
    expect(kernel.execute(ir, [{ entityId: 'e', budget: 1000 }], {}).results[0].eligible).toBe(true);
    expect(kernel.execute(ir, [{ entityId: 'e', budget: 500  }], {}).results[0].eligible).toBe(false);
    expect(kernel.execute(ir, [{ entityId: 'e', budget: 3000 }], {}).results[0].eligible).toBe(false);
  });

  it('condition op=or: at least one must pass', () => {
    const ir = makeIR({
      executionPlan: [
        {
          id: 'or_gate',
          type: 'gate',
          condition: {
            op: 'or',
            args: [
              { op: 'eq', left: 'major', right: 'cs' },
              { op: 'eq', left: 'major', right: 'eng' },
            ],
          },
          humanMeaning: 'STEM only',
          weight: 1,
          dependsOn: [],
        },
      ],
    });
    expect(kernel.execute(ir, [{ entityId: 'e', major: 'cs'  }], {}).results[0].eligible).toBe(true);
    expect(kernel.execute(ir, [{ entityId: 'e', major: 'art' }], {}).results[0].eligible).toBe(false);
  });

  it('condition op=not: inverts result', () => {
    const ir = makeIR({
      executionPlan: [
        {
          id: 'not_gate',
          type: 'gate',
          condition: { op: 'not', arg: { op: 'eq', left: 'flag', right: 1 } },
          humanMeaning: 'flag must not be 1',
          weight: 1,
          dependsOn: [],
        },
      ],
    });
    expect(kernel.execute(ir, [{ entityId: 'e', flag: 0 }], {}).results[0].eligible).toBe(true);
    expect(kernel.execute(ir, [{ entityId: 'e', flag: 1 }], {}).results[0].eligible).toBe(false);
  });

  // ── Trace integrity ───────────────────────────────────────────────────────────

  it('trace contains decisionId, irHash, inputHash, entityId', () => {
    const ir = makeIR({ executionPlan: [] });
    const entity = { entityId: 'e_trace' };
    const { results } = kernel.execute(ir, [entity], {});
    const { trace } = results[0];
    expect(trace.decisionId).toBeTruthy();
    expect(trace.irHash).toBe('abc123');
    expect(trace.inputHash).toBeTruthy();
    expect(trace.entityId).toBe('e_trace');
  });

  it('same entity + same IR always produce the same decisionId', () => {
    const ir = makeIR({ executionPlan: [] });
    const entity = { entityId: 'stable', perf: 80 };
    const r1 = kernel.execute(ir, [entity], {});
    const r2 = kernel.execute(ir, [entity], {});
    expect(r1.results[0].trace.decisionId).toBe(r2.results[0].trace.decisionId);
  });

  it('multiple entities are all processed independently', () => {
    const ir = makeIR({
      executionPlan: [
        { id: 'g', type: 'gate', condition: { op: 'gte', left: 'budget', right: 1000 }, weight: 1, dependsOn: [] },
      ],
    });
    const entities = [
      { entityId: 'cheap', budget: 500 },
      { entityId: 'pricey', budget: 1500 },
    ];
    const { results } = kernel.execute(ir, entities, {});
    expect(results).toHaveLength(2);
    expect(results.find(r => r.entityId === 'cheap').eligible).toBe(false);
    expect(results.find(r => r.entityId === 'pricey').eligible).toBe(true);
  });

  // ── Money-blindness guarantee ────────────────────────────────────────────────

  it('commercial fields (priceUsd, affiliateUrl) in entity do NOT affect eligibility or score', () => {
    const ir = makeIR({
      executionPlan: [
        { id: 'final', type: 'score', weights: { perf: 1.0 }, isFinal: true, dependsOn: [] },
      ],
    });
    const noCommercial  = { entityId: 'e1', perf: 80 };
    const withCommercial = { entityId: 'e2', perf: 80, priceUsd: 500, affiliateUrl: 'x', commissionRate: 0.1 };
    const r1 = kernel.execute(ir, [noCommercial], {}).results[0];
    const r2 = kernel.execute(ir, [withCommercial], {}).results[0];
    expect(r1.score).toBeCloseTo(r2.score);
    expect(r1.eligible).toBe(r2.eligible);
  });
});
