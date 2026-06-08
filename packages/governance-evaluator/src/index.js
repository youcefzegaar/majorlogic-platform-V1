/**
 * governance-evaluator — Unified evaluator registry + integrity certificate.
 *
 * Contract: { id, severity, evaluate(decision, trace, ctx) → { id, severity, passed, evidence } }
 * runAll(decision, trace, ctx) → IntegrityCertificate
 *
 * Five guards (four synchronous + one sampled):
 *   1. governance-drift  — wraps enforceGovernance result from ctx
 *   2. catalog-truth     — catalog must have ≥ 3 published entities (ctx.catalogTruth.total)
 *   3. sacrifice         — hero card must have cost + tradeoff (permanent M1 guarantee)
 *   4. money-separation  — Spearman rank–affiliate correlation + no commercial fields in scoring
 *   5. determinism       — same inputs → same irHash; sampled 5% via ctx.determinismProbe
 *
 * Guards run AFTER the decision and NEVER alter it (Observer, not Salesman).
 * Governance must never block a user's decision — all errors caught internally.
 * Determinism: for 5% of requests platform-core computes the probe before runAll and passes
 * ctx.determinismProbe = { sampled: true, irHashPresent: bool, irHash }. For the other 95%,
 * the guard passes optimistically with evidence.sampled = false.
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

// Strings that signal the engine found NO real trade-off data.
// If cost.text matches any of these, the sacrifice is synthetic — not truthful.
const SYNTHETIC_SACRIFICE_PATTERNS = [
  /no significant trade-?off/i,
  /no prominent weakness/i,
  /without.*significant compromise/i,
  /meets all your stated.*without/i,
  /did not surface a dominant trade-?off/i,
  /لا تسويات جوهرية/,
  /لا توجد تسويات جوهرية/,
  /لا توجد نقاط ضعف/,
  /لم تكشف بياناتنا/,
];

function isSyntheticSacrificeText(text) {
  if (typeof text !== 'string' || text.length === 0) return true;
  return SYNTHETIC_SACRIFICE_PATTERNS.some(re => re.test(text));
}

// ── Guard 3: Sacrifice always shown ──────────────────────────────────────────

function evaluateSacrifice(decision) {
  const cards = Array.isArray(decision?.cards) ? decision.cards : [];
  const hero = cards.find(c => c.cardType === 'hero') ?? cards[0] ?? null;

  const cost     = hero?.explanation?.cost;
  const tradeoff = hero?.explanation?.tradeoff;

  // severity:'none' means buildExplanation found no real sacrifices.
  // Synthetic text also means the engine had nothing real to show.
  const costIsReal     = cost != null && cost.severity !== 'none' && !isSyntheticSacrificeText(cost.text);
  const tradeoffIsReal = tradeoff != null && !isSyntheticSacrificeText(tradeoff.text);

  return {
    id: 'sacrifice',
    severity: 'critical',
    passed: costIsReal && tradeoffIsReal,
    evidence: {
      heroCardType:     hero?.cardType ?? null,
      costPresent:      cost != null,
      costSeverity:     cost?.severity ?? null,
      tradeoffPresent:  tradeoff != null,
      costSynthetic:    cost != null ? isSyntheticSacrificeText(cost.text) : null,
      tradeoffSynthetic: tradeoff != null ? isSyntheticSacrificeText(tradeoff.text) : null,
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

  // Spearman: card rank (1=best) vs affiliate boolean (1=is affiliate).
  // Requires at least 2 cards — single-card decisions can't be ranked.
  if (cards.length < 2) {
    return {
      id: 'money-separation',
      severity: 'critical',
      status: 'insufficient_data',
      passed: false,
      evidence: {
        spearmanCorrelation: null,
        commercialFieldsInScoring: commercialFieldsFound,
        cardCount: cards.length,
        affiliateCardCount: cards.filter(c => c.bestOffer?.isAffiliate).length,
      },
    };
  }

  const ranks = cards.map((_, i) => i + 1);
  const affiliateValues = cards.map(c => (c.bestOffer?.isAffiliate ? 1 : 0));
  const corrValue = spearmanCorrelation(ranks, affiliateValues);

  const passed = commercialFieldsFound.length === 0 && Math.abs(corrValue) <= 0.15;

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

// ── Guard 5: Determinism ──────────────────────────────────────────────────────
// For 5% of requests, platform-core computes a probe before runAll and passes
// ctx.determinismProbe = { sampled: true, irHashPresent: bool, irHash }.
// For the remaining 95%, the guard passes optimistically with sampled: false.

function evaluateDeterminism(decision, _trace, ctx) {
  const probe = ctx?.determinismProbe;

  if (!probe || !probe.sampled) {
    const topCard = Array.isArray(decision?.cards) ? decision.cards[0] : null;
    return {
      id: 'determinism',
      severity: 'high',
      status: 'not_verified',
      passed: false,
      evidence: {
        sampled: false,
        irHashInfrastructureActive: topCard?.trace?.irHash != null,
      },
    };
  }

  const passed = probe.irHashPresent === true;
  return {
    id: 'determinism',
    severity: 'high',
    status: passed ? 'verified' : 'failed',
    passed,
    evidence: {
      sampled: true,
      irHashPresent: probe.irHashPresent,
      irHash: probe.irHash ?? null,
    },
  };
}

// ── Registry + runAll ─────────────────────────────────────────────────────────

const EVALUATORS = [evaluateGovernanceDrift, evaluateCatalogTruth, evaluateSacrifice, evaluateMoneySeparation, evaluateDeterminism];

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

  // not_verified and insufficient_data guards are neutral — excluded from overallPassed and score.
  const verifiable = guards.filter(g => g.status !== 'not_verified' && g.status !== 'insufficient_data');
  const overallPassed = verifiable.every(g => g.passed);

  const maxScore = verifiable.reduce((s, g) => s + (SEVERITY_WEIGHTS[g.severity] ?? 10), 0);
  const earnedScore = verifiable
    .filter(g => g.passed)
    .reduce((s, g) => s + (SEVERITY_WEIGHTS[g.severity] ?? 10), 0);
  const integrityScore = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 100;

  // guardsMap: keyed by id for efficient DB storage + JSONB querying
  const guardsMap = Object.fromEntries(
    guards.map(g => [g.id, { passed: g.passed, status: g.status, severity: g.severity, evidence: g.evidence }])
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
