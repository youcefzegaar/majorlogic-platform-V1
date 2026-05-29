import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { DecisionExplainer } from '../../packages/decision-explanation/src/index.js';

const explainer = new DecisionExplainer({ logger: { log: () => {}, error: () => {}, warn: () => {} } });

const makeTrace = (overrides = {}) => ({
  isEligible: true,
  scores: {
    performance_score: 72,
    battery_score:     55,
    portability_score: 80,
    value_score:       45,
  },
  sacrifices: {
    s1: { meaning: 'reduced_battery', severity: 0.5, type: 'soft_sacrifice' },
  },
  irHash: 'abc123',
  overallScore: 68,
  ...overrides,
});

const makeProfile = (prefs) => ({ preferences: prefs });

// ── Test 1: fallback populates all 3 fields with AI off ─────────────────────
describe('DecisionExplainer.explain — AI off fallback', () => {
  it('returns non-null tradeoff and badNews from trace without AI', async () => {
    const trace = makeTrace();
    const domainContext = { useAI: false, locale: 'en' };

    const result = await explainer.explain(trace, 'TestDevice', domainContext);

    assert.ok(result.story,    'story must be non-null');
    assert.ok(result.tradeoff, 'tradeoff must be non-null when AI is off');
    assert.ok(result.badNews,  'badNews must be non-null when AI is off');
    assert.equal(typeof result.tradeoff, 'string');
    assert.equal(typeof result.badNews,  'string');
    assert.ok(result.tradeoff.length > 0, 'tradeoff must not be empty');
    assert.ok(result.badNews.length  > 0, 'badNews must not be empty');
  });

  it('returns non-null tradeoff and badNews even with empty sacrifices', async () => {
    const trace = makeTrace({ sacrifices: {} });
    const domainContext = { useAI: false, locale: 'en' };

    const result = await explainer.explain(trace, 'TestDevice', domainContext);

    assert.ok(result.tradeoff, 'tradeoff must be non-null even with no sacrifices');
    assert.ok(result.badNews,  'badNews must be non-null even with no sacrifices');
  });
});

// ── Test 2: reasons ordered by user weight (highest priority first) ──────────
describe('DecisionExplainer.buildExplanation — reason ordering', () => {
  it('returns reasons in descending user-weight order', () => {
    const trace = makeTrace();
    const profile = makeProfile({
      battery:     90,  // highest weight — must be first
      performance: 70,  // second
      portability: 50,  // third
    });

    const { reasons } = explainer.buildExplanation(trace, profile, null, 'en');

    assert.ok(Array.isArray(reasons),         'reasons must be an array');
    assert.ok(reasons.length > 0,             'reasons must be non-empty');
    assert.equal(reasons[0].dimKey, 'battery',     'first reason must be the highest-weight priority');
    assert.equal(reasons[1].dimKey, 'performance', 'second reason must follow by weight');
    assert.equal(reasons[2].dimKey, 'portability', 'third reason must follow by weight');
  });

  it('includes score and userIdeal in each reason', () => {
    const trace = makeTrace();
    const profile = makeProfile({ performance: 80, battery: 60 });

    const { reasons } = explainer.buildExplanation(trace, profile, null, 'en');

    for (const r of reasons) {
      assert.equal(typeof r.dimKey,    'string', 'dimKey must be a string');
      assert.equal(typeof r.userIdeal, 'number', 'userIdeal must be a number');
    }
  });
});

// ── Test 3: determinism — same trace → identical output ─────────────────────
describe('DecisionExplainer.buildExplanation — determinism', () => {
  it('produces identical output for the same trace and profile', () => {
    const trace   = makeTrace();
    const profile = makeProfile({ performance: 80, battery: 60, portability: 40 });
    const runner  = { title: 'Runner', score: 62 };

    const out1 = explainer.buildExplanation(trace, profile, runner, 'en');
    const out2 = explainer.buildExplanation(trace, profile, runner, 'en');

    assert.deepEqual(out1, out2, 'buildExplanation must be fully deterministic');
  });

  it('produces different cost blocks when sacrifices differ', () => {
    const profile = makeProfile({ performance: 80 });

    const withSacrifice    = explainer.buildExplanation(makeTrace(), profile, null, 'en');
    const withoutSacrifice = explainer.buildExplanation(makeTrace({ sacrifices: {} }), profile, null, 'en');

    assert.notEqual(withSacrifice.cost.severity, 'none', 'should have non-none severity with sacrifice');
    assert.equal(withoutSacrifice.cost.severity, 'none', 'should have none severity without sacrifice');
  });
});

// ── Test 4: buildExplanation always returns all 5 keys ──────────────────────
describe('DecisionExplainer.buildExplanation — structure completeness', () => {
  it('always returns headline, reasons, cost, runnerUp, math', () => {
    const trace   = makeTrace();
    const profile = makeProfile({ performance: 80, battery: 60 });

    const out = explainer.buildExplanation(trace, profile, null, 'en');

    assert.ok('headline' in out, 'must have headline');
    assert.ok('reasons'  in out, 'must have reasons');
    assert.ok('cost'     in out, 'must have cost');
    assert.ok('runnerUp' in out, 'must have runnerUp (null when no runner passed)');
    assert.ok('math'     in out, 'must have math');
    assert.equal(out.runnerUp, null, 'runnerUp must be null when not provided');
  });

  it('populates runnerUp when a runner card is passed', () => {
    const trace   = makeTrace();
    const profile = makeProfile({ performance: 80 });
    const runner  = { title: 'Competitor', score: 60 };

    const { runnerUp } = explainer.buildExplanation(trace, profile, runner, 'en');

    assert.ok(runnerUp,             'runnerUp must be non-null');
    assert.equal(runnerUp.name, 'Competitor');
    assert.ok('swapHint' in runnerUp, 'must have swapHint');
  });
});
