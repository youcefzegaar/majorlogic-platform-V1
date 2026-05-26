import { describe, it, expect } from 'vitest';
import {
  DecisionOrchestrator,
  IR_CACHE_MAX_SIZE,
  _irCacheSize
} from '../../packages/decision-orchestrator/src/index.js';

// Counter ensures every call to makeConfig() returns a unique domainId,
// avoiding accidental cache hits across tests (the cache is module-level).
let seq = 0;
const makeConfig = (prefix = 'cache') => ({ domainId: `${prefix}-${++seq}`, version: '1.0.0' });

describe('IR Cache — LRU bounding', () => {
  it('second call with same config returns the same IR reference (cache hit)', () => {
    const o = new DecisionOrchestrator();
    const config = makeConfig('ref');
    const ir1 = o._getCompiledIR(config);
    const ir2 = o._getCompiledIR(config);
    expect(ir1).toBe(ir2);
  });

  it('cache size never exceeds IR_CACHE_MAX_SIZE regardless of how many configs are added', () => {
    const o = new DecisionOrchestrator();
    for (let i = 0; i < IR_CACHE_MAX_SIZE * 2; i++) {
      o._getCompiledIR(makeConfig('overflow'));
    }
    expect(_irCacheSize()).toBeLessThanOrEqual(IR_CACHE_MAX_SIZE);
  });

  it('LRU-promoted entry survives subsequent evictions', () => {
    const o = new DecisionOrchestrator();

    // Fill cache to exactly max size
    const configs = Array.from({ length: IR_CACHE_MAX_SIZE }, () => makeConfig('lru'));
    configs.forEach(c => o._getCompiledIR(c));

    // Promote configs[0] to MRU position
    const anchorIr = o._getCompiledIR(configs[0]);

    // Add more entries — these evict the oldest (configs[1], configs[2], ...) not configs[0]
    for (let i = 0; i < 5; i++) {
      o._getCompiledIR(makeConfig('evict'));
    }

    // configs[0] was MRU so it should still be in cache → same reference
    const afterEvictionIr = o._getCompiledIR(configs[0]);
    expect(afterEvictionIr).toBe(anchorIr);
  });

  it('irHash on a cached IR is a non-empty string', () => {
    const o = new DecisionOrchestrator();
    const ir = o._getCompiledIR(makeConfig('hash'));
    expect(typeof ir.irHash).toBe('string');
    expect(ir.irHash.length).toBeGreaterThan(0);
  });
});
