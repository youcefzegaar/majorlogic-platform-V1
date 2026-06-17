/**
 * catalog-intelligence/contracts.js
 *
 * Agent interface contracts — capability declarations, not implementations.
 *
 * Each export defines the stable API surface for an intelligence agent.
 * Current implementations are heuristic stubs. Replace the body of any
 * `analyze()` function with a real model without changing the call-site.
 *
 * Stability guarantee: input/output shapes are frozen. Internal logic is not.
 */

// ── Price Intelligence ────────────────────────────────────────────────────────

/**
 * Analyzes a price history series and returns market signals.
 *
 * @param {Array<{ date: string, priceUsd: number, seller: string }>} priceHistory
 * @returns {{ trend: string, volatility: number, anomalies: Array, predictedNextWeek: number|null }}
 */
export function analyzePriceHistory(priceHistory = []) {
  if (!priceHistory.length) {
    return { trend: "unknown", volatility: 0, anomalies: [], predictedNextWeek: null };
  }

  const prices = priceHistory.map(p => p.priceUsd);
  const latest = prices.at(-1);
  const earliest = prices[0];
  const delta = latest - earliest;
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;

  // Volatility = normalized standard deviation
  const variance = prices.reduce((s, p) => s + (p - avg) ** 2, 0) / prices.length;
  const volatility = Math.round((Math.sqrt(variance) / avg) * 100) / 100;

  const trend = delta > avg * 0.05 ? "rising"
    : delta < -avg * 0.05 ? "falling"
    : "stable";

  // Stub: no ML prediction yet
  return { trend, volatility, anomalies: [], predictedNextWeek: null };
}

// ── Review Intelligence ───────────────────────────────────────────────────────

/**
 * Evaluates review signals for trustworthiness and sentiment.
 *
 * @param {{ topCons: string[], topPros: string[], reviewRiskScore: number, reviewCoverage: number }} reviewSummary
 * @param {{ sourceConfidence: number }} trust
 * @returns {{ sentiment: string, biasScore: number, verifiedCoverage: number, dominantCons: string[] }}
 */
export function analyzeReviewSignals(reviewSummary = {}, trust = {}) {
  const riskScore = reviewSummary.reviewRiskScore ?? 0;
  const coverage  = reviewSummary.reviewCoverage  ?? 0;
  const sourceConf = trust.sourceConfidence ?? 0.5;

  // biasScore: 0 = highly trusted, 1 = likely biased/sparse
  const biasScore = Math.round(
    (riskScore * 0.5 + (1 - sourceConf) * 0.3 + (coverage < 10 ? 0.2 : 0)) * 100
  ) / 100;

  const sentiment =
    riskScore < 0.25 && coverage > 20 ? "positive"
    : riskScore > 0.4                 ? "mixed"
    : "neutral";

  return {
    sentiment,
    biasScore,
    verifiedCoverage: coverage,
    dominantCons: (reviewSummary.topCons ?? []).slice(0, 3)
  };
}

// ── Spec Intelligence ─────────────────────────────────────────────────────────

/**
 * Assesses the completeness and reliability of a spec set.
 *
 * @param {object}   specs          — normalized specs object
 * @param {string[]} inferredFields — fields whose values are heuristic estimates
 * @returns {{ completeness: number, reliabilityScore: number, inferredCount: number, gaps: string[] }}
 */
export function analyzeSpecCompleteness(specs = {}, inferredFields = []) {
  const expectedFields = [
    "ramGb", "storageGb", "gpuClass", "platform",
    "performance", "display", "battery", "portability", "thermals"
  ];

  const presentFields  = expectedFields.filter(f => specs[f] !== undefined && specs[f] !== null);
  const gaps           = expectedFields.filter(f => !presentFields.includes(f));
  const realFields     = presentFields.filter(f => !inferredFields.includes(f));
  const completeness   = Math.round((presentFields.length / expectedFields.length) * 100) / 100;
  const reliabilityScore = Math.round((realFields.length / Math.max(1, presentFields.length)) * 100) / 100;

  return {
    completeness,
    reliabilityScore,
    inferredCount: inferredFields.length,
    gaps
  };
}

// ── Benchmark Intelligence ────────────────────────────────────────────────────

/**
 * Converts raw benchmark scores into a normalized performance tier.
 * Stub — replace with real benchmark dataset comparison later.
 *
 * @param {{ performance: number, thermals: number, battery: number }} scores
 * @returns {{ tier: string, bottleneck: string|null, sustainedScore: number }}
 */
export function analyzeBenchmarkScores(scores = {}) {
  const perf    = scores.performance ?? 50;
  const thermals = scores.thermals   ?? 50;
  const battery  = scores.battery    ?? 50;

  // Sustained = performance penalized by thermals (throttling proxy)
  const sustainedScore = Math.round(perf * (thermals / 100));

  const tier =
    sustainedScore >= 80 ? "high"
    : sustainedScore >= 60 ? "mid-high"
    : sustainedScore >= 40 ? "mid"
    : "entry";

  const bottleneck =
    thermals < 55 ? "thermal_throttling"
    : battery  < 50 ? "battery_endurance"
    : null;

  return { tier, bottleneck, sustainedScore };
}
