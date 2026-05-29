/**
 * governance-evaluator — Unified evaluator registry + integrity certificate.
 *
 * Contract: { id, severity, evaluate(decision, trace, ctx) → { id, severity, passed, evidence } }
 * runAll(decision, trace, ctx) → IntegrityCertificate
 *
 * Four synchronous guards (fast, non-blocking):
 *   1. governance-drift  — wraps enforceGovernance result from ctx
 *   2. catalog-truth     — catalog must have ≥ 3 published entities (ctx.catalogTruth.total)
 *   3. sacrifice         — hero card must have cost + tradeoff (permanent M1 guarantee)
 *   4. money-separation  — Spearman rank–affiliate correlation + no commercial fields in scoring
 *
 * Guards run AFTER the decision and NEVER alter it (Observer, not Salesman).
 * Governance must never block a user's decision — all errors caught internally.
 * Determinism is probed async at 5% sampling rate (G.5) via saveDeterminismProbe.
 */

// Severity weights for integrityScore calculation
const SEVERITY_WEIGHTS = { critical: 40, high: 20 };

// Commercial fields that must not appear in card scoring breakdowns
const COMMERCIAL_FIELDS_IN_SCORING = ['commissionRate', 'affiliateUrl', 'affiliateSeller'];

/**
 * Spearman rank correlation — pure function, no external dependencies.
 * ranks: 1-indexed positions (1=best), values: numeric values for each position.
 */
function spearmanCorrelation(ranks, values) {
  const n = ranks.length;
  if (n < 2) return 0;
  // If all values are identical, correlation is undefined → no bias signal → treat as 0
  if (new Set(values).size === 1) return 0;
  // Rank the values (descending: higher value = lower rank number = better)
  const sorted = [...values].map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const valueRanks = new Array(n);
  sorted.forEach((x, r) => { valueRanks[x.i] = r + 1; });
  const dSqSum = ranks.reduce((s, r, i) => s + (r - valueRanks[i]) ** 2, 0);
  return 1 - (6 * dSqSum) / (n * (n * n - 1));
}

// ── Guard 1: Governance drift ─────────────────────────────────────────────────

function evaluateGovernanceDrift(_decision, _trace, ctx) {
  const g = ctx?.governance ?? { ok: true, violations: [], warnings: [] };
  return {
    id: 'governance-drift',
    severity: 'high',
    passed: g.ok === true,
    evidence: {
      violations: g.violations ?? [],
      warnings: g.warnings ?? [],
    },
  };
}

// ── Guard 2: Catalog truth ────────────────────────────────────────────────────

function evaluateCatalogTruth(_decision, _trace, ctx) {
  const total = ctx?.catalogTruth?.total ?? 0;
  const passed = total >= 3;
  return {
    id: 'catalog-truth',
    severity: 'high',
    passed,
    evidence: {
      publishedEntityCount: total,
      minRequired: 3,
    },
  };
}

// ── Guard 3: Sacrifice always shown ──────────────────────────────────────────

function evaluateSacrifice(decision) {
  const cards = Array.isArray(decision?.cards) ? decision.cards : [];
  const hero = cards.find(c => c.cardType === 'hero') ?? cards[0] ?? null;
  const hasCost = hero?.explanation?.cost != null;
  const hasTradeoff = hero?.explanation?.tradeoff != null;
  return {
    id: 'sacrifice',
    severity: 'critical',
    passed: hasCost && hasTradeoff,
    evidence: {
      heroCardType: hero?.cardType ?? null,
      costPresent: hasCost,
      tradeoffPresent: hasTradeoff,
    },
  };
}

// ── Guard 4: Money-separation ─────────────────────────────────────────────────

function evaluateMoneySeparation(decision) {
  const cards = Array.isArray(decision?.cards) ? decision.cards : [];

  // Check for commercial fields in card scoring breakdowns
  const commercialFieldsFound = [];
  for (const card of cards) {
    const breakdown = card.traceScores ?? card.scoreBreakdown ?? {};
    for (const field of COMMERCIAL_FIELDS_IN_SCORING) {
      if (field in breakdown && !commercialFieldsFound.includes(field)) {
        commercialFieldsFound.push(field);
      }
    }
  }

  // Spearman: card rank (1=best) vs affiliate boolean (1=is affiliate)
  let corrValue = 0;
  if (cards.length >= 2) {
    const ranks = cards.map((_, i) => i + 1);
    const affiliateValues = cards.map(c => (c.bestOffer?.isAffiliate ? 1 : 0));
    corrValue = spearmanCorrelation(ranks, affiliateValues);
  }

  const passed = commercialFieldsFound.length === 0 && Math.abs(corrValue) <= 0.3;

  return {
    id: 'money-separation',
    severity: 'critical',
    passed,
    evidence: {
      spearmanCorrelation: Math.round(corrValue * 1000) / 1000,
      commercialFieldsInScoring: commercialFieldsFound,
      cardCount: cards.length,
      affiliateCardCount: cards.filter(c => c.bestOffer?.isAffiliate).length,
    },
  };
}

// ── Registry + runAll ─────────────────────────────────────────────────────────

const EVALUATORS = [evaluateGovernanceDrift, evaluateCatalogTruth, evaluateSacrifice, evaluateMoneySeparation];

/**
 * Run all evaluators and return an IntegrityCertificate.
 *
 * @param {object} decision — result from orchestrator.run()
 * @param {object|null} trace — optional raw trace (not used yet, reserved)
 * @param {object} ctx — { governance: {ok,violations,warnings} }
 * @returns {IntegrityCertificate}
 */
export function runAll(decision, trace, ctx) {
  const guards = EVALUATORS.map(fn => fn(decision, trace, ctx));
  const overallPassed = guards.every(g => g.passed);

  const maxScore = guards.reduce((s, g) => s + (SEVERITY_WEIGHTS[g.severity] ?? 10), 0);
  const earnedScore = guards
    .filter(g => g.passed)
    .reduce((s, g) => s + (SEVERITY_WEIGHTS[g.severity] ?? 10), 0);
  const integrityScore = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 100;

  // guardsMap: keyed by id for efficient DB storage + JSONB querying
  const guardsMap = Object.fromEntries(
    guards.map(g => [g.id, { passed: g.passed, severity: g.severity, evidence: g.evidence }])
  );

  return {
    decisionRunId: decision?.decisionRunId ?? null,
    evaluatedAt: new Date().toISOString(),
    guards,
    guardsMap,
    overallPassed,
    integrityScore,
  };
}
