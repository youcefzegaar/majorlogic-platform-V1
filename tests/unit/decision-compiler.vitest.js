import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionCompiler } from '../../packages/decision-compiler/src/index.js';

let compiler;
beforeEach(() => { compiler = new DecisionCompiler(); });

const MINIMAL_CONFIG = { domainId: 'test-minimal', version: '1.0.0' };

const SCORED_CONFIG = {
  domainId: 'test-scored',
  version: '2.0.0',
  attributes: {
    price: { type: 'attribute', dataType: 'number' }
  },
  scores: {
    value_score: { type: 'score', isFinal: true, weights: { price: 1 } }
  }
};

const CYCLE_CONFIG = {
  domainId: 'test-cycle',
  version: '1.0.0',
  metrics: {
    a: { formula: { op: 'add', args: ['b', 1] } },
    b: { formula: { op: 'add', args: ['a', 1] } }
  }
};

describe('DecisionCompiler — IR shape', () => {
  it('returns an object with id, version, irHash, and executionPlan', () => {
    const ir = compiler.compile(MINIMAL_CONFIG);
    expect(ir).toMatchObject({
      id:            expect.any(String),
      version:       expect.any(String),
      irHash:        expect.any(String),
      executionPlan: expect.any(Array)
    });
  });

  it('id matches domainId from config', () => {
    const ir = compiler.compile(MINIMAL_CONFIG);
    expect(ir.id).toBe('test-minimal');
  });

  it('version matches config version', () => {
    const ir = compiler.compile(SCORED_CONFIG);
    expect(ir.version).toBe('2.0.0');
  });

  it('executionPlan is a non-empty array when config has nodes', () => {
    const ir = compiler.compile(SCORED_CONFIG);
    expect(ir.executionPlan.length).toBeGreaterThan(0);
  });

  it('each executionPlan node has an id and type', () => {
    const ir = compiler.compile(SCORED_CONFIG);
    for (const node of ir.executionPlan) {
      expect(typeof node.id).toBe('string');
      expect(typeof node.type).toBe('string');
    }
  });

  it('score nodes have a weights object', () => {
    const ir = compiler.compile(SCORED_CONFIG);
    const scoreNodes = ir.executionPlan.filter(n => n.type === 'score');
    expect(scoreNodes.length).toBeGreaterThan(0);
    for (const node of scoreNodes) {
      expect(node.weights).toBeDefined();
      expect(typeof node.weights).toBe('object');
    }
  });
});

describe('DecisionCompiler — irHash stability', () => {
  it('produces the same irHash for identical configs', () => {
    const ir1 = compiler.compile({ ...MINIMAL_CONFIG });
    const ir2 = compiler.compile({ ...MINIMAL_CONFIG });
    expect(ir1.irHash).toBe(ir2.irHash);
  });

  it('produces different irHash when config structure changes', () => {
    const ir1 = compiler.compile({
      domainId: 'hash-a', version: '1.0.0',
      attributes: { price: { type: 'attribute', dataType: 'number' } }
    });
    const ir2 = compiler.compile({
      domainId: 'hash-a', version: '1.0.0',
      attributes: { price: { type: 'attribute', dataType: 'number' }, ram: { type: 'attribute', dataType: 'number' } }
    });
    expect(ir1.irHash).not.toBe(ir2.irHash);
  });

  it('irHash is a 64-character hex string (SHA-256)', () => {
    const ir = compiler.compile(MINIMAL_CONFIG);
    expect(ir.irHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('DecisionCompiler — topological sort', () => {
  it('dependency nodes appear before dependent nodes in executionPlan', () => {
    const ir = compiler.compile(SCORED_CONFIG);
    const plan = ir.executionPlan;
    const priceIdx      = plan.findIndex(n => n.id === 'price');
    const valueScoreIdx = plan.findIndex(n => n.id === 'value_score');
    // price (dependency) must come before value_score (dependent)
    expect(priceIdx).toBeLessThan(valueScoreIdx);
  });
});

describe('DecisionCompiler — error cases', () => {
  it('throws on circular dependency', () => {
    expect(() => compiler.compile(CYCLE_CONFIG)).toThrow(/cycle/i);
  });

  it('throws on config missing domainId', () => {
    expect(() => compiler.compile({ version: '1.0.0' })).toThrow();
  });
});
