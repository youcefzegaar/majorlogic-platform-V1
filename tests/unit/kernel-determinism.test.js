/**
 * kernel-determinism.test.js
 *
 * Verifies that the Decision Kernel is fully deterministic:
 *   - Same input always produces the same irHash and output scores.
 *   - Key ordering in the input object does not affect results.
 *   - Empty / minimal input never throws, always returns a stable structure.
 */

import { describe, it, expect } from 'vitest';
import { DecisionKernel } from '../../packages/decision-kernel/src/index.js';

// Silent logger — suppresses all kernel log output during tests
const silentLogger = { log: () => {}, warn: () => {}, error: () => {} };

// ─── Shared minimal IR fixture ────────────────────────────────────────────────
// Built by hand (bypasses the compiler) so we can run pure kernel unit tests
// without depending on any domain config or the compiler package.
const MINIMAL_IR = {
  id: 'test-determinism',
  version: '1.0.0',
  irHash: 'fixed-hash-abc123', // static — we are testing output stability, not compiler hashing
  executionPlan: [
    { id: 'price',     type: 'attribute' },
    { id: 'ram',       type: 'attribute' },
    {
      id: 'gate_budget',
      type: 'gate',
      condition: { op: 'lte', left: 'price', right: 1500 },
      humanMeaning: 'Must be within budget',
      weight: 0.8,
    },
    {
      id: 'score_total',
      type: 'score',
      isFinal: true,
      weights: { ram: 3, price: -0.02 },
      penalties: {},
    },
  ],
};

const ENTITY_A = { entityId: 'laptop-a', price: 1200, ram: 16 };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Kernel Determinism', () => {
  const kernel = new DecisionKernel(silentLogger);

  it('produces identical score on repeated executions with same input', () => {
    const run1 = kernel.execute(MINIMAL_IR, [ENTITY_A], {});
    const run2 = kernel.execute(MINIMAL_IR, [ENTITY_A], {});
    const run3 = kernel.execute(MINIMAL_IR, [ENTITY_A], {});

    expect(run1.results[0].score).toBe(run2.results[0].score);
    expect(run2.results[0].score).toBe(run3.results[0].score);
  });

  it('produces identical irHash on the trace for the same IR', () => {
    const run1 = kernel.execute(MINIMAL_IR, [ENTITY_A], {});
    const run2 = kernel.execute(MINIMAL_IR, [ENTITY_A], {});

    expect(run1.results[0].trace.irHash).toBe(MINIMAL_IR.irHash);
    expect(run1.results[0].trace.irHash).toBe(run2.results[0].trace.irHash);
  });

  it('produces the same result regardless of property order in the entity object', () => {
    // Same data, different key ordering
    const entityNormal  = { entityId: 'laptop-b', price: 999, ram: 8 };
    const entityReordered = { ram: 8, price: 999, entityId: 'laptop-b' };

    const resultNormal   = kernel.execute(MINIMAL_IR, [entityNormal],   {});
    const resultReordered = kernel.execute(MINIMAL_IR, [entityReordered], {});

    // Scores must be equal
    expect(resultNormal.results[0].score).toBe(resultReordered.results[0].score);
    // Eligibility must be equal
    expect(resultNormal.results[0].eligible).toBe(resultReordered.results[0].eligible);
  });

  it('does not throw on an empty entity object', () => {
    const emptyEntity = { entityId: 'empty' };

    expect(() => {
      kernel.execute(MINIMAL_IR, [emptyEntity], {});
    }).not.toThrow();
  });

  it('returns a score of 0 (not NaN/Infinity) for an empty entity', () => {
    const emptyEntity = { entityId: 'empty' };
    const result = kernel.execute(MINIMAL_IR, [emptyEntity], {});

    const score = result.results[0].score;
    expect(isFinite(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('always includes required trace fields', () => {
    const result = kernel.execute(MINIMAL_IR, [ENTITY_A], {});
    const { trace } = result.results[0];

    expect(trace).toHaveProperty('decisionId');
    expect(trace).toHaveProperty('irHash');
    expect(trace).toHaveProperty('inputHash');
    expect(trace).toHaveProperty('entityId');
    expect(trace).toHaveProperty('steps');
    expect(trace).toHaveProperty('scores');
    expect(trace).toHaveProperty('sacrifices');
    expect(trace).toHaveProperty('exclusions');
  });

  it('generates a different inputHash when entity data changes', () => {
    const entityLow  = { entityId: 'laptop-c', price: 800, ram: 8  };
    const entityHigh = { entityId: 'laptop-c', price: 800, ram: 16 };

    const resultLow  = kernel.execute(MINIMAL_IR, [entityLow],  {});
    const resultHigh = kernel.execute(MINIMAL_IR, [entityHigh], {});

    // Different data → different inputHash → different decisionId
    expect(resultLow.results[0].trace.inputHash).not.toBe(resultHigh.results[0].trace.inputHash);
    expect(resultLow.results[0].trace.decisionId).not.toBe(resultHigh.results[0].trace.decisionId);
  });

  /**
   * Regression: isFinal with score=0
   *
   * Bug: `if (node.isFinal && !values.final_score)` treated 0 as falsy, allowing
   * a later isFinal node to overwrite a legitimately-zero first score.
   * Fix: changed to `values.final_score === undefined`.
   *
   * The IR below has two isFinal score nodes. The first produces 0 (all-zero
   * weights), the second would produce a nonzero value. The final_score must
   * remain 0 — locked by the first isFinal node, never overwritten by the second.
   */
  it('preserves final_score of 0 — does not overwrite a zero score with a later isFinal node', () => {
    const IR_ZERO_FINAL = {
      id: 'test-zero-final',
      version: '1.0.0',
      irHash: 'zero-final-hash',
      executionPlan: [
        { id: 'value', type: 'attribute' },
        {
          id: 'score_zero',
          type: 'score',
          isFinal: true,
          weights: { value: 0 }, // always produces score=0
        },
        {
          id: 'score_nonzero',
          type: 'score',
          isFinal: true,
          weights: { value: 5 }, // would produce score=50 for value=10
        },
      ],
    };

    const entity = { entityId: 'test-zero', value: 10 };
    const result = kernel.execute(IR_ZERO_FINAL, [entity], {});
    const { score } = result.results[0];

    // The first isFinal node claims the slot (score=0).
    // With the bug, !0 === true would let score_nonzero overwrite it.
    expect(score).toBe(0);
  });
});
