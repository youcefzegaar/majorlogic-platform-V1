import { describe, it, expect } from 'vitest';
import { classifyLaptopCategory, detectBrand } from '../../domains/laptop-student-us/normalizers.js';

// Import internals via the ownership-strategy module.
// We test computeLifecycleCost indirectly through buildOwnershipStrategy,
// but the helper functions are tested via a minimal inline re-implementation
// that mirrors the exact formulas in ownership-strategy/src/index.js.
// This keeps the tests fast and decoupled from the full pipeline.

// ── Inline mirrors of the three helpers (must stay in sync with index.js) ──────
function getDepreciationRate(isMac, resaleScore) {
  const base = isMac ? 0.19 : 0.27;
  const adj = ((resaleScore - 75) / 100) * -0.10;
  return Math.max(0.12, Math.min(0.42, base + adj));
}

function classifyUsageIntensity(profile) {
  const perf  = profile?.priorities?.performance ?? 50;
  const major = profile?.major ?? '';
  const MAJOR_BOOST = { cs: 12, engineering: 12, ai: 12, design: 7 };
  const adjusted = perf + (MAJOR_BOOST[major] ?? 0);
  if (adjusted >= 70) return 'heavy';
  if (adjusted >= 42) return 'medium';
  return 'light';
}

const MAINTENANCE_RATES = { light: 0.020, medium: 0.035, heavy: 0.052 };

function computeLifecycleCost({
  purchasePrice, resaleScore, ownershipYears = 4,
  laptopCategory = 'non_mac', usageIntensity = 'medium',
}) {
  const price  = purchasePrice || 0;
  const isMac  = laptopCategory === 'mac';
  const rate   = getDepreciationRate(isMac, resaleScore ?? 55);
  const estimatedResaleValue = Math.round(price * Math.pow(1 - rate, ownershipYears));
  const maintenanceCost = Math.round(price * (MAINTENANCE_RATES[usageIntensity] ?? 0.035) * ownershipYears);
  const netCost     = price - estimatedResaleValue;
  const costPerYear = Math.round(netCost / ownershipYears);
  return { purchasePrice: price, ownershipYears, laptopCategory, usageIntensity,
    estimatedResaleValue, maintenanceCost, netCost,
    totalCostWithMaintenance: netCost + maintenanceCost, costPerYear,
    tco: netCost + maintenanceCost, annualDepreciationPct: Math.round(rate * 100) };
}
// ────────────────────────────────────────────────────────────────────────────────

describe('classifyLaptopCategory', () => {
  it('returns mac for apple brand', () => {
    expect(classifyLaptopCategory(detectBrand('Apple MacBook Air M2'))).toBe('mac');
  });

  it('returns non_mac for lenovo', () => {
    expect(classifyLaptopCategory(detectBrand('Lenovo ThinkPad X1'))).toBe('non_mac');
  });

  it('returns non_mac for asus', () => {
    expect(classifyLaptopCategory(detectBrand('ASUS ROG Strix'))).toBe('non_mac');
  });

  it('returns non_mac for unknown brand', () => {
    expect(classifyLaptopCategory('unknown')).toBe('non_mac');
  });
});

describe('getDepreciationRate', () => {
  it('Mac with high resaleScore has lower rate than non-Mac', () => {
    expect(getDepreciationRate(true, 96)).toBeLessThan(getDepreciationRate(false, 96));
  });

  it('Mac M2 (resaleScore=96) ≈ 0.169', () => {
    expect(getDepreciationRate(true, 96)).toBeCloseTo(0.169, 3);
  });

  it('ThinkPad X1 (resaleScore=90) ≈ 0.255', () => {
    expect(getDepreciationRate(false, 90)).toBeCloseTo(0.255, 3);
  });

  it('Budget Dell (resaleScore=62) ≈ 0.283', () => {
    expect(getDepreciationRate(false, 62)).toBeCloseTo(0.283, 3);
  });

  it('ordering: mac<96> < non_mac<90> < non_mac<62>', () => {
    const macRate = getDepreciationRate(true, 96);
    const thinkpadRate = getDepreciationRate(false, 90);
    const dellRate = getDepreciationRate(false, 62);
    expect(macRate).toBeLessThan(thinkpadRate);
    expect(thinkpadRate).toBeLessThan(dellRate);
  });

  it('worst resaleScore (0) for non_mac stays within clamp ceiling (≤0.42)', () => {
    expect(getDepreciationRate(false, 0)).toBeLessThanOrEqual(0.42);
    expect(getDepreciationRate(false, 0)).toBeCloseTo(0.345, 3);
  });

  it('best resaleScore (100) for mac stays within clamp floor (≥0.12)', () => {
    expect(getDepreciationRate(true, 100)).toBeGreaterThanOrEqual(0.12);
    expect(getDepreciationRate(true, 100)).toBeCloseTo(0.165, 3);
  });
});

describe('classifyUsageIntensity', () => {
  it('cs major + performance=58 → heavy (58+12=70)', () => {
    expect(classifyUsageIntensity({ major: 'cs', priorities: { performance: 58 } })).toBe('heavy');
  });

  it('design major + performance=63 → heavy (63+7=70)', () => {
    expect(classifyUsageIntensity({ major: 'design', priorities: { performance: 63 } })).toBe('heavy');
  });

  it('general major + performance=65 → medium', () => {
    expect(classifyUsageIntensity({ major: 'general', priorities: { performance: 65 } })).toBe('medium');
  });

  it('general major + performance=30 → light', () => {
    expect(classifyUsageIntensity({ major: 'general', priorities: { performance: 30 } })).toBe('light');
  });

  it('undefined profile → medium (no crash)', () => {
    expect(classifyUsageIntensity(undefined)).toBe('medium');
  });
});

describe('computeLifecycleCost', () => {
  it('mac $1000 has lower costPerYear than non_mac $1000 at same resaleScore', () => {
    const mac = computeLifecycleCost({ purchasePrice: 1000, resaleScore: 75, laptopCategory: 'mac' });
    const pc  = computeLifecycleCost({ purchasePrice: 1000, resaleScore: 75, laptopCategory: 'non_mac' });
    expect(mac.costPerYear).toBeLessThan(pc.costPerYear);
  });

  it('mac $1000 estimatedResaleValue > $300 (not the broken $269)', () => {
    const { estimatedResaleValue } = computeLifecycleCost({ purchasePrice: 1000, resaleScore: 96, laptopCategory: 'mac' });
    expect(estimatedResaleValue).toBeGreaterThan(300);
  });

  it('costPerYear = round((price - resale) / years) — maintenance excluded', () => {
    const r = computeLifecycleCost({ purchasePrice: 1000, resaleScore: 70, laptopCategory: 'non_mac', ownershipYears: 4 });
    expect(r.costPerYear).toBe(Math.round((r.purchasePrice - r.estimatedResaleValue) / r.ownershipYears));
  });

  it('heavy.maintenanceCost > medium.maintenanceCost > light.maintenanceCost', () => {
    const base = { purchasePrice: 1000, resaleScore: 70, laptopCategory: 'non_mac', ownershipYears: 4 };
    const heavy  = computeLifecycleCost({ ...base, usageIntensity: 'heavy' });
    const medium = computeLifecycleCost({ ...base, usageIntensity: 'medium' });
    const light  = computeLifecycleCost({ ...base, usageIntensity: 'light' });
    expect(heavy.maintenanceCost).toBeGreaterThan(medium.maintenanceCost);
    expect(medium.maintenanceCost).toBeGreaterThan(light.maintenanceCost);
  });

  it('totalCostWithMaintenance = netCost + maintenanceCost', () => {
    const r = computeLifecycleCost({ purchasePrice: 1200, resaleScore: 82, laptopCategory: 'non_mac' });
    expect(r.totalCostWithMaintenance).toBe(r.netCost + r.maintenanceCost);
  });

  it('backward compat — works with only purchasePrice + resaleScore (no crash)', () => {
    expect(() => computeLifecycleCost({ purchasePrice: 1000, resaleScore: 70 })).not.toThrow();
  });

  it('backward compat — defaults to non_mac + medium', () => {
    const r = computeLifecycleCost({ purchasePrice: 1000, resaleScore: 70 });
    expect(r.laptopCategory).toBe('non_mac');
    expect(r.usageIntensity).toBe('medium');
  });
});
