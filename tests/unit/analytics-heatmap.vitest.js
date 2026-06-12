import { describe, it, expect } from 'vitest';

// Pure aggregation logic extracted from the /analytics endpoint for unit testing
const BUCKETS = [
  { label: '≥90',   min: 90,  max: 101 },
  { label: '80–89', min: 80,  max: 90  },
  { label: '70–79', min: 70,  max: 80  },
  { label: '60–69', min: 60,  max: 70  },
  { label: '<60',   min: 0,   max: 60  },
];

function buildHeatmap(interventions) {
  const byConstraint = {};
  for (const row of interventions) {
    const key = row.relaxed_constraint ?? 'unknown';
    if (!byConstraint[key]) byConstraint[key] = {};
    const score = row.integrity_score ?? 100;
    for (const bucket of BUCKETS) {
      if (score >= bucket.min && score < bucket.max) {
        byConstraint[key][bucket.label] = (byConstraint[key][bucket.label] ?? 0) + 1;
        break;
      }
    }
  }
  return Object.entries(byConstraint)
    .map(([constraint, counts]) => ({
      constraint,
      label: constraint.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      buckets: BUCKETS.map(b => ({ label: b.label, count: counts[b.label] ?? 0 })),
      total: Object.values(counts).reduce((s, v) => s + v, 0),
    }))
    .sort((a, b) => b.total - a.total);
}

describe('Analytics heatmap aggregation', () => {
  it('returns empty array for no interventions', () => {
    expect(buildHeatmap([])).toEqual([]);
  });

  it('counts a single intervention in the correct bucket', () => {
    const rows = [{ relaxed_constraint: 'within_budget', integrity_score: 85 }];
    const result = buildHeatmap(rows);
    expect(result).toHaveLength(1);
    expect(result[0].constraint).toBe('within_budget');
    const bucket = result[0].buckets.find(b => b.label === '80–89');
    expect(bucket.count).toBe(1);
  });

  it('integrity score 90 goes into ≥90 bucket', () => {
    const rows = [{ relaxed_constraint: 'min_ram', integrity_score: 90 }];
    const result = buildHeatmap(rows);
    const bucket = result[0].buckets.find(b => b.label === '≥90');
    expect(bucket.count).toBe(1);
  });

  it('integrity score 59 goes into <60 bucket', () => {
    const rows = [{ relaxed_constraint: 'min_ram', integrity_score: 59 }];
    const result = buildHeatmap(rows);
    const bucket = result[0].buckets.find(b => b.label === '<60');
    expect(bucket.count).toBe(1);
  });

  it('null relaxed_constraint → "unknown" group', () => {
    const rows = [{ relaxed_constraint: null, integrity_score: 75 }];
    const result = buildHeatmap(rows);
    expect(result[0].constraint).toBe('unknown');
  });

  it('null integrity_score defaults to 100 → ≥90 bucket', () => {
    const rows = [{ relaxed_constraint: 'within_budget', integrity_score: null }];
    const result = buildHeatmap(rows);
    const bucket = result[0].buckets.find(b => b.label === '≥90');
    expect(bucket.count).toBe(1);
  });

  it('multiple interventions accumulate per bucket', () => {
    const rows = [
      { relaxed_constraint: 'within_budget', integrity_score: 82 },
      { relaxed_constraint: 'within_budget', integrity_score: 84 },
      { relaxed_constraint: 'within_budget', integrity_score: 72 },
    ];
    const result = buildHeatmap(rows);
    expect(result[0].total).toBe(3);
    const bucket8089 = result[0].buckets.find(b => b.label === '80–89');
    expect(bucket8089.count).toBe(2);
    const bucket7079 = result[0].buckets.find(b => b.label === '70–79');
    expect(bucket7079.count).toBe(1);
  });

  it('heatmap is sorted by total descending', () => {
    const rows = [
      { relaxed_constraint: 'min_ram',       integrity_score: 80 },
      { relaxed_constraint: 'within_budget', integrity_score: 80 },
      { relaxed_constraint: 'within_budget', integrity_score: 82 },
    ];
    const result = buildHeatmap(rows);
    expect(result[0].constraint).toBe('within_budget');
    expect(result[0].total).toBe(2);
    expect(result[1].constraint).toBe('min_ram');
  });

  it('label is a human-readable title-case string', () => {
    const rows = [{ relaxed_constraint: 'min_ram_required', integrity_score: 88 }];
    const result = buildHeatmap(rows);
    expect(result[0].label).toBe('Min Ram Required');
  });

  it('all 5 bucket labels are present per row', () => {
    const rows = [{ relaxed_constraint: 'x', integrity_score: 95 }];
    const result = buildHeatmap(rows);
    expect(result[0].buckets.map(b => b.label)).toEqual(['≥90', '80–89', '70–79', '60–69', '<60']);
  });
});
