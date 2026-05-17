// evaluateCandidate, buildNoResults
import { rawConfig, kernel, decisionIR } from "./kernel-state.js";

export function evaluateCandidate({ profile, entity, ruleset, catalog }) {
  const flattenedEntity = {
      ...entity,
      price: entity.market?.bestOffer?.priceUsd ?? 9999,
      battery: entity.specs?.battery ?? 0,
      portability: entity.specs?.portability ?? 50,
      weight: entity.specs?.weight ?? 2,
      performance: entity.specs?.performance ?? 0,
      ramGb: entity.specs?.ramGb ?? 0,
      display: entity.specs?.display ?? 0,
      thermals: entity.specs?.thermals ?? 50,
      resale: entity.economicSignals?.resaleScore ?? 50
  };

  // ─── Pure Kernel: Map user preferences into the IR context ───────────────
  // Normalize: 0 pref → 0.5 (neutral, not nullifying), 100 pref → 1.0 (full weight)
  // Formula: 0.5 + (pref / 100) * 0.5
  // This prevents a zero-slider from annihilating a dimension entirely,
  // while still reflecting genuine user priority differences.
  const normalize = (val, fallback = 50) =>
    0.5 + ((val ?? fallback) / 100) * 0.5;

  const prefs = profile.preferences || {};
  const kernelContext = {
    budget: profile.budgetUsd,
    major:  profile.major,
    // User preference multipliers — fully traceable in the IR
    userPrefPerformance: normalize(prefs.performance),
    userPrefBattery:     normalize(prefs.battery),
    userPrefPortability: normalize(prefs.portability),
    userPrefDisplay:     normalize(prefs.display),
    userPrefResale:      normalize(prefs.resale)
  };
  // ─────────────────────────────────────────────────────────────────────────

  const activeRulesetId = rawConfig.rulesets[profile.major] ? profile.major : "general";
  const kernelResult = kernel.execute(decisionIR, [flattenedEntity], kernelContext, {
    targetScoreId: `score_${activeRulesetId}`
  });

  const result = kernelResult.results[0];
  const trace = result.trace;

  // ─── NO 40/60 BLEND — the Kernel IS the source of truth ─────────────────
  // The score is 100% produced by the compiled IR with full trace provenance.
  // Every weight, every penalty, every gate is recorded in trace.scores.
  // ─────────────────────────────────────────────────────────────────────────

  // Law of Sacrifice: Quantify what was lost to gain the win
  const sacrificeVector = {
    price: (profile.budgetUsd - flattenedEntity.price) / profile.budgetUsd,
    performance: (flattenedEntity.performance - 70) / 30,
    portability: (flattenedEntity.portability - 70) / 30,
    resale: (flattenedEntity.resale - 50) / 50
  };

  return {
    entity,
    eligible: result.eligible,
    exclusionReasons: trace.exclusions,
    score: result.score,
    match: result.score,
    sacrificeVector,
    trace: trace,
    componentScores: trace.scores,
    fitState: entity.fitStates?.[profile.major]?.state ?? "unknown"
  };
}

export function buildNoResults({ profile, evaluatedCandidates, status, relaxationScore }) {
  if (status === "COGNITIVE_COLLAPSE") {
    return {
      type: "COGNITIVE_COLLAPSE",
      message: "Logical Integrity Failed: No rational decision is possible within these constraints without losing all meaning.",
      relaxationScore
    };
  }

  return {
    type: "no_viable_option",
    message: "No eligible device remained after applying the current rules.",
    suggestions: ["Lower performance expectations", "Increase budget"]
  };
}
