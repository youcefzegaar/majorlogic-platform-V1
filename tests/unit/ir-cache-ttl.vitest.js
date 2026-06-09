import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DecisionOrchestrator,
  IR_CACHE_TTL_MS,
  _irCacheSize,
} from '../../packages/decision-orchestrator/src/index.js';

// Each test uses a unique domainId so module-level cache doesn't leak state
let seq = 9000;
const makeConfig = () => ({ domainId: `ttl-test-${++seq}`, version: '1.0.0' });

describe('IR Cache — TTL expiry', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('IR_CACHE_TTL_MS is exported and equals 30 minutes', () => {
    expect(IR_CACHE_TTL_MS).toBe(30 * 60 * 1000);
  });

  it('cache hit: same IR reference returned before TTL expires', () => {
    const o = new DecisionOrchestrator();
    const cfg = makeConfig();
    const ir1 = o._getCompiledIR(cfg);

    // Advance time by less than TTL
    vi.advanceTimersByTime(IR_CACHE_TTL_MS - 1000);
    const ir2 = o._getCompiledIR(cfg);

    expect(ir2).toBe(ir1);
  });

  it('cache miss: new IR compiled after TTL expires', () => {
    const o = new DecisionOrchestrator();
    const cfg = makeConfig();
    const ir1 = o._getCompiledIR(cfg);

    // Advance time past TTL
    vi.advanceTimersByTime(IR_CACHE_TTL_MS + 1);
    const ir2 = o._getCompiledIR(cfg);

    // New object was compiled — not the same reference
    expect(ir2).not.toBe(ir1);
    // But irHash must be identical (same config → same logic)
    expect(ir2.irHash).toBe(ir1.irHash);
  });

  it('expired entry is removed from cache before recompile (no double-entry)', () => {
    const o = new DecisionOrchestrator();
    const cfg = makeConfig();

    const sizeBefore = _irCacheSize();
    o._getCompiledIR(cfg);
    const sizeAfterFirst = _irCacheSize();
    expect(sizeAfterFirst).toBe(sizeBefore + 1);

    vi.advanceTimersByTime(IR_CACHE_TTL_MS + 1);
    o._getCompiledIR(cfg); // expired → delete + recompile + re-add
    const sizeAfterExpiry = _irCacheSize();

    // Size should still be sizeBefore + 1, not sizeBefore + 2
    expect(sizeAfterExpiry).toBe(sizeBefore + 1);
  });
});
