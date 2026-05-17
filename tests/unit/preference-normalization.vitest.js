import { describe, it, expect } from 'vitest';

// Mirrors the normalize function in decision-orchestrator/src/index.js
function normalize(v) {
  return Math.max(0, Math.min(100, v ?? 50)) / 100;
}

describe('Preference Normalization', () => {
  it('maps 0 preference to 0.0 weight (no bias toward dim)', () => {
    expect(normalize(0)).toBe(0);
  });

  it('maps 50 (neutral) preference to 0.5 weight', () => {
    expect(normalize(50)).toBe(0.5);
  });

  it('maps 100 preference to 1.0 weight (full weight)', () => {
    expect(normalize(100)).toBe(1.0);
  });

  it('defaults undefined to 50 → 0.5', () => {
    expect(normalize(undefined)).toBe(0.5);
  });

  it('clamps values above 100 to 1.0', () => {
    expect(normalize(150)).toBe(1.0);
  });

  it('clamps negative values to 0.0', () => {
    expect(normalize(-10)).toBe(0.0);
  });

  it('gives meaningfully different weights for 0 vs 100 (was broken: old formula gave 0.5 and 1.0)', () => {
    const low  = normalize(0);
    const high = normalize(100);
    expect(high - low).toBe(1.0); // full range, not 0.5
  });

  it('linear — midpoint is exactly midpoint of range', () => {
    const a = normalize(25);
    const b = normalize(75);
    expect(a + b).toBeCloseTo(1.0, 10);
  });
});
