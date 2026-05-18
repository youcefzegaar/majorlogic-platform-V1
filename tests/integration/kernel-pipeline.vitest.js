import { describe, it, expect } from 'vitest';
import { DecisionKernel } from '../../packages/decision-kernel/src/index.js';

const kernel = new DecisionKernel({ log: () => {} });

// Minimal IR fixture for testing — mirrors what DecisionCompiler produces
const SIMPLE_IR = {
  id: 'test-ir',
  version: '1.0',
  irHash: 'test-hash-abc123',
  executionPlan: [
    { id: 'price', type: 'attribute' },
    { id: 'ram', type: 'attribute' },
    {
      id: 'value_score',
      type: 'derived',
      formula: { op: 'multiply', args: ['ram', { op: 'inverse', arg: 'price' }] }
    },
    {
      id: 'within_budget',
      type: 'gate',
      condition: { op: 'lte', left: 'price', right: 2000 },
      weight: 1.0,
      humanMeaning: 'Must be within budget'
    },
    {
      id: 'final_score',
      type: 'score',
      formula: { op: 'multiply', args: ['value_score', 100] }
    }
  ]
};

const ENTITIES = [
  { entityId: 'laptop-a', price: 1200, ram: 16 },
  { entityId: 'laptop-b', price: 2500, ram: 32 }, // over budget
  { entityId: 'laptop-c', price: 999, ram: 8 }
];

describe('DecisionKernel — pipeline integrity', () => {
  it('executes without throwing', () => {
    expect(() => kernel.execute(SIMPLE_IR, ENTITIES)).not.toThrow();
  });

  it('returns a result for every entity', () => {
    const { results } = kernel.execute(SIMPLE_IR, ENTITIES);
    expect(results).toHaveLength(ENTITIES.length);
  });

  it('each result has an entityId', () => {
    const { results } = kernel.execute(SIMPLE_IR, ENTITIES);
    for (const r of results) {
      expect(r.trace.entityId).toBeTruthy();
    }
  });

  it('gate violation marks entity as ineligible', () => {
    const { results } = kernel.execute(SIMPLE_IR, ENTITIES);
    const laptopB = results.find(r => r.trace.entityId === 'laptop-b');
    expect(laptopB).toBeDefined();
    expect(laptopB.trace.isEligible).toBe(false);
  });

  it('within-budget entities remain eligible', () => {
    const { results } = kernel.execute(SIMPLE_IR, ENTITIES);
    const laptopA = results.find(r => r.trace.entityId === 'laptop-a');
    const laptopC = results.find(r => r.trace.entityId === 'laptop-c');
    expect(laptopA.trace.isEligible).toBe(true);
    expect(laptopC.trace.isEligible).toBe(true);
  });

  it('is deterministic — same input always produces same trace hashes', () => {
    const run1 = kernel.execute(SIMPLE_IR, ENTITIES);
    const run2 = kernel.execute(SIMPLE_IR, ENTITIES);
    const hashes1 = run1.results.map(r => r.trace.decisionId);
    const hashes2 = run2.results.map(r => r.trace.decisionId);
    expect(hashes1).toEqual(hashes2);
  });

  it('sacrifice vector is populated on gate violation', () => {
    const { results } = kernel.execute(SIMPLE_IR, ENTITIES);
    const laptopB = results.find(r => r.trace.entityId === 'laptop-b');
    expect(Object.keys(laptopB.trace.sacrifices).length).toBeGreaterThan(0);
  });
});

describe('DecisionKernel — crypto security', () => {
  it('encodes both irHash and inputHash into decisionId', () => {
    const { results } = kernel.execute(SIMPLE_IR, ENTITIES);
    // decisionId should differ between entities (different inputHash)
    const ids = results.map(r => r.trace.decisionId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
