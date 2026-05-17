/**
 * kernel-sacrifice.test.js
 *
 * Verifies that the Kernel's Sacrifice Vector is computed correctly:
 *   - Gate violations are recorded as "gate_violation" sacrifices in the trace.
 *   - Score-level soft penalties are recorded as "soft_sacrifice" sacrifices.
 *   - badNews (the sacrifice summary) is attached to the first recommendation.
 *   - No sacrifice is recorded when no gate or penalty fires.
 */

import { describe, it, expect } from 'vitest';
import { DecisionKernel } from '../../packages/decision-kernel/src/index.js';

const silentLogger = { log: () => {}, warn: () => {}, error: () => {} };

// ─── IR Fixtures ──────────────────────────────────────────────────────────────

/**
 * An IR that has:
 *   - A hard gate (gate_budget) — fails when price > 1000
 *   - A score with a soft penalty (penalty_heavy) — fires when weight_kg > 2.5
 */
const IR_WITH_CONSTRAINTS = {
  id: 'test-sacrifice',
  version: '1.0.0',
  irHash: 'sacrifice-hash-001',
  executionPlan: [
    { id: 'price',     type: 'attribute' },
    { id: 'ram',       type: 'attribute' },
    { id: 'weight_kg', type: 'attribute' },
    {
      id: 'gate_budget',
      type: 'gate',
      condition: { op: 'lte', left: 'price', right: 1000 },
      humanMeaning: 'Must be within $1000 budget',
      weight: 0.8,
    },
    {
      id: 'score_total',
      type: 'score',
      isFinal: true,
      weights: { ram: 4 },
      penalties: {
        penalty_heavy: {
          condition: { op: 'gt', left: 'weight_kg', right: 2.5 },
          amount: 15,
          reason: 'Heavy device sacrifices portability',
        },
      },
    },
  ],
};

/**
 * An IR with no gates and no penalties — clean execution.
 */
const IR_CLEAN = {
  id: 'test-no-sacrifice',
  version: '1.0.0',
  irHash: 'clean-hash-001',
  executionPlan: [
    { id: 'ram', type: 'attribute' },
    {
      id: 'score_total',
      type: 'score',
      isFinal: true,
      weights: { ram: 5 },
      penalties: {},
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Kernel Sacrifice Vector', () => {
  const kernel = new DecisionKernel(silentLogger);

  // ── Gate violations ─────────────────────────────────────────────────────────

  it('records gate_violation in sacrifices when the gate fails', () => {
    const entity = { entityId: 'expensive', price: 1500, ram: 16, weight_kg: 2.0 };
    const result = kernel.execute(IR_WITH_CONSTRAINTS, [entity], {});
    const { trace } = result.results[0];

    expect(trace.sacrifices).toHaveProperty('gate_budget');
    expect(trace.sacrifices['gate_budget'].type).toBe('gate_violation');
  });

  it('sets severity on gate_violation from the gate weight field', () => {
    const entity = { entityId: 'expensive', price: 1500, ram: 16, weight_kg: 2.0 };
    const result = kernel.execute(IR_WITH_CONSTRAINTS, [entity], {});
    const sacrifice = result.results[0].trace.sacrifices['gate_budget'];

    // Weight is 0.8 on the gate node
    expect(sacrifice.severity).toBe(0.8);
  });

  it('marks the entity ineligible when a gate fails', () => {
    const entity = { entityId: 'expensive', price: 1500, ram: 16, weight_kg: 2.0 };
    const result = kernel.execute(IR_WITH_CONSTRAINTS, [entity], {});

    expect(result.results[0].eligible).toBe(false);
    expect(result.results[0].trace.exclusions).toContain('gate_budget');
  });

  it('does NOT record gate sacrifice when gate passes', () => {
    const entity = { entityId: 'affordable', price: 800, ram: 16, weight_kg: 2.0 };
    const result = kernel.execute(IR_WITH_CONSTRAINTS, [entity], {});
    const { trace } = result.results[0];

    expect(trace.sacrifices).not.toHaveProperty('gate_budget');
    expect(trace.exclusions).not.toContain('gate_budget');
  });

  // ── Soft penalties ──────────────────────────────────────────────────────────

  it('records soft_sacrifice when a penalty condition fires', () => {
    // price within budget, but heavy device triggers penalty
    const entity = { entityId: 'heavy', price: 800, ram: 16, weight_kg: 3.0 };
    const result = kernel.execute(IR_WITH_CONSTRAINTS, [entity], {});
    const { trace } = result.results[0];

    expect(trace.sacrifices).toHaveProperty('penalty_heavy');
    expect(trace.sacrifices['penalty_heavy'].type).toBe('soft_sacrifice');
  });

  it('attaches the penalty reason to the soft_sacrifice meaning', () => {
    const entity = { entityId: 'heavy', price: 800, ram: 16, weight_kg: 3.0 };
    const result = kernel.execute(IR_WITH_CONSTRAINTS, [entity], {});
    const sacrifice = result.results[0].trace.sacrifices['penalty_heavy'];

    expect(sacrifice.meaning).toBe('Heavy device sacrifices portability');
  });

  it('penalty reduces the final score below its base value', () => {
    const lightEntity = { entityId: 'light',  price: 800, ram: 16, weight_kg: 1.5 };
    const heavyEntity = { entityId: 'heavy',  price: 800, ram: 16, weight_kg: 3.0 };

    const resultLight = kernel.execute(IR_WITH_CONSTRAINTS, [lightEntity], {});
    const resultHeavy = kernel.execute(IR_WITH_CONSTRAINTS, [heavyEntity], {});

    expect(resultHeavy.results[0].score).toBeLessThan(resultLight.results[0].score);
  });

  it('does NOT record soft_sacrifice when penalty condition does not fire', () => {
    const entity = { entityId: 'light', price: 800, ram: 16, weight_kg: 1.5 };
    const result = kernel.execute(IR_WITH_CONSTRAINTS, [entity], {});

    expect(result.results[0].trace.sacrifices).not.toHaveProperty('penalty_heavy');
  });

  // ── Clean path ──────────────────────────────────────────────────────────────

  it('sacrifices object is empty when no gates or penalties fire', () => {
    const entity = { entityId: 'clean', ram: 16 };
    const result = kernel.execute(IR_CLEAN, [entity], {});

    expect(Object.keys(result.results[0].trace.sacrifices)).toHaveLength(0);
    expect(result.results[0].eligible).toBe(true);
  });

  // ── badNews (top recommendation) ────────────────────────────────────────────
  // The Orchestrator's _buildCard() attaches trace.sacrifices as card.sacrifices,
  // and the Explainer surfaces them as "badNews".
  // Here we verify the Kernel's half of that contract: sacrifice data is on trace.

  it('first eligible result has sacrifices accessible on its trace', () => {
    // Both entities are within budget; the heavy one has a soft sacrifice
    const lightEntity = { entityId: 'light', price: 800, ram: 16, weight_kg: 1.5 };
    const heavyEntity = { entityId: 'heavy', price: 800, ram: 16, weight_kg: 3.0 };

    const result = kernel.execute(IR_WITH_CONSTRAINTS, [lightEntity, heavyEntity], {});
    const eligibleResults = result.results.filter(r => r.eligible);

    expect(eligibleResults.length).toBeGreaterThan(0);

    // The first eligible result's trace must expose the sacrifices map for card rendering
    const firstTrace = eligibleResults[0].trace;
    expect(firstTrace).toHaveProperty('sacrifices');
    expect(typeof firstTrace.sacrifices).toBe('object');
  });

  it('sacrifice severity is a finite number between 0 and 1', () => {
    const entity = { entityId: 'heavy', price: 800, ram: 16, weight_kg: 3.0 };
    const result = kernel.execute(IR_WITH_CONSTRAINTS, [entity], {});
    const sacrifices = result.results[0].trace.sacrifices;

    for (const [, s] of Object.entries(sacrifices)) {
      expect(isFinite(s.severity)).toBe(true);
      expect(s.severity).toBeGreaterThanOrEqual(0);
      expect(s.severity).toBeLessThanOrEqual(1);
    }
  });
});
