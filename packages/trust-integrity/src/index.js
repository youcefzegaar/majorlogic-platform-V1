function round(value, digits = 2) {
  return Number(Number(value ?? 0).toFixed(digits));
}

function classifyConfidence(score) {
  if (score >= 0.88) return "high";
  if (score >= 0.75) return "medium";
  return "low";
}

function summarizeReasons(reasonCounts = {}) {
  return Object.entries(reasonCounts)
    .sort((left, right) => right[1] - left[1])
    .map(([reason, count]) => ({ reason, count }));
}

export function auditDecision({ catalog, decision }) {
  const findings = [];
  const cardAudits = [];
  const confidenceInputs = [];

  for (const card of decision.cards) {
    const entity = catalog.all().find((entry) => entry.entityId === card.entityId);
    if (!entity) {
      findings.push(`Missing published variant for card ${card.cardType}.`);
      cardAudits.push({
        cardType: card.cardType,
        entityId: card.entityId,
        status: "failed",
        confidenceScore: 0,
        confidenceLevel: "low",
        warnings: ["missing_published_entity"],
        strengths: []
      });
      continue;
    }

    const warnings = [];
    const strengths = [];

    if (!card.badNews) {
      warnings.push("missing_bad_news");
      findings.push(`Card ${card.cardType} is missing bad news.`);
    } else {
      strengths.push("bad_news_disclosed");
    }

    if (!card.tradeoff) {
      warnings.push("missing_tradeoff");
      findings.push(`Card ${card.cardType} is missing tradeoff explanation.`);
    } else {
      strengths.push("tradeoff_disclosed");
    }

    if (!card.whyThis) {
      warnings.push("missing_explanation");
      findings.push(`Card ${card.cardType} is missing explanation text.`);
    } else {
      strengths.push("explanation_present");
    }

    if ((entity.trust.freshnessDays ?? 0) > 14) {
      warnings.push("stale_market_data");
      findings.push(`Card ${card.cardType} uses stale market data.`);
    } else {
      strengths.push("fresh_market_data");
    }

    if ((entity.trust.reviewCoverage ?? 0) < 12) {
      warnings.push("thin_review_coverage");
    } else {
      strengths.push("review_coverage_present");
    }

    if ((entity.trust.sourceConfidence ?? 0) < 0.85) {
      warnings.push("medium_source_confidence");
    } else {
      strengths.push("strong_source_confidence");
    }

    if (card.cardType === "hero" && card.offerCondition === "open_box") {
      warnings.push("hero_open_box_violation");
      findings.push("Hero card violates the no-open-box policy.");
    }

    const confidenceScore = round(
      (entity.trust.sourceConfidence ?? 0) * 0.55 +
      Math.min((entity.trust.reviewCoverage ?? 0) / 30, 1) * 0.25 +
      Math.max(0, 1 - ((entity.trust.freshnessDays ?? 0) / 30)) * 0.20
    );

    confidenceInputs.push(confidenceScore);

    cardAudits.push({
      cardType: card.cardType,
      entityId: card.entityId,
      title: card.title,
      fitState: card.fitState ?? entity.fitStates?.general?.state ?? "unknown",
      offerCondition: card.offerCondition ?? entity.market?.bestOffer?.condition ?? "unknown",
      confidenceScore,
      confidenceLevel: classifyConfidence(confidenceScore),
      warnings,
      strengths,
      sourceConfidence: entity.trust.sourceConfidence ?? null,
      reviewCoverage: entity.trust.reviewCoverage ?? null,
      freshnessDays: entity.trust.freshnessDays ?? null,
      resaleScore: card.resaleScore ?? entity.economicSignals?.resaleScore ?? null
    });
  }

  const exclusionSummary = summarizeReasons(decision.excludedReasonCounts ?? {});
  const explainability = {
    allCardsHaveBadNews: decision.cards.every((card) => Boolean(card.badNews)),
    allCardsHaveTradeoff: decision.cards.every((card) => Boolean(card.tradeoff)),
    allCardsHaveExplanation: decision.cards.every((card) => Boolean(card.whyThis))
  };

  const decisionConfidenceScore = confidenceInputs.length
    ? round(confidenceInputs.reduce((total, score) => total + score, 0) / confidenceInputs.length)
    : 0;

  if (decision.status === "no_viable_option") {
    findings.push("No viable option was returned, so the engine fell back to its explicit no-result path.");
  }

  return {
    ok: findings.length === 0,
    decisionConfidenceScore,
    decisionConfidenceLevel: classifyConfidence(decisionConfidenceScore),
    findings,
    cardAudits,
    exclusionSummary,
    explainability,
    trace: {
      evaluatedCount: decision.evaluatedCount ?? 0,
      candidateCount: decision.candidateCount ?? 0,
      excludedCount: decision.excludedCount ?? 0,
      selectedCardCount: decision.cards.length
    }
  };
}
