// chooseCard, buildCard, recommendOwnership, cardTypes
import { CARD_TYPES } from "../../packages/shared-kernel/src/index.js";
import { explainer } from "./kernel-state.js";

export { CARD_TYPES as cardTypes };

export function chooseCard(cardType, eligibleCandidates, profile, ruleset, ctx) {
  if (!eligibleCandidates.length) return null;
  const selectedIds = ctx?.selectedEntityIds || [];
  const available = eligibleCandidates.filter(c => !selectedIds.includes(c.entity.entityId));
  if (!available.length) return null; // No unique device left — skip this card slot

  if (cardType === "hero") {
    // Best overall score
    return [...available].sort((a, b) => b.score - a.score)[0];
  }
  if (cardType === "smart_budget") {
    // Best value: highest score-per-dollar
    return [...available].sort((a, b) => {
      const priceA = a.entity.market.bestOffer?.priceUsd ?? 9999;
      const priceB = b.entity.market.bestOffer?.priceUsd ?? 9999;
      return (b.score / priceB) - (a.score / priceA);
    })[0];
  }
  if (cardType === "future_proof") {
    // Highest specs ceiling (RAM + performance + storage weighted)
    // Rationale: In the cloud-first era (2025+), local storage matters roughly 1/100th
    // compared to RAM or CPU performance for long-term scalability.
    const STORAGE_WEIGHT = 0.01;

    return [...available].sort((a, b) => {
      const specA = (a.entity.specs?.ramGb || 0) + (a.entity.specs?.performance || 0) + ((a.entity.specs?.storageGb || 0) * STORAGE_WEIGHT);
      const specB = (b.entity.specs?.ramGb || 0) + (b.entity.specs?.performance || 0) + ((b.entity.specs?.storageGb || 0) * STORAGE_WEIGHT);
      return specB - specA;
    })[0];
  }
  return available[0];
}

export async function buildCard(cardType, selection, profile, ctx = {}) {
  const entity = selection.entity;

  // Compute genuine excluded alternatives
  let excluded = [];
  if (ctx.evaluatedCandidates) {
    // Find devices that failed eligibility
    const failures = ctx.evaluatedCandidates.filter(c => !c.eligible);
    // Sort by score or name to get consistent ones, grab top 2
    excluded = failures.slice(0, 2).map(c => ({
      name: c.entity.title,
      reason: c.exclusionReasons && c.exclusionReasons.length > 0
        ? c.exclusionReasons[0].message
        : "Did not meet core constraints"
    }));
  }

  return {
    cardType,
    entityId: entity.entityId,
    title: entity.title,
    priceUsd: entity.market.bestOffer?.priceUsd ?? 0,
    score: selection.score,
    match: selection.score,
    sacrificeVector: selection.sacrificeVector,
    whyThis: await explainer.explain(selection.trace, entity.title, {
      locale: profile.locale || 'en',
      reviewWarnings: {
        primary: profile.locale === 'ar' ? entity.reviewIntelligence.primaryWarningAr : entity.reviewIntelligence.primaryWarning,
        secondary: profile.locale === 'ar' ? entity.reviewIntelligence.secondaryWarningAr : entity.reviewIntelligence.secondaryWarning
      }
    }),
    badNews: profile.locale === 'ar'
      ? (entity.reviewIntelligence.primaryWarningAr ?? "لا يوجد تحذير حرج.")
      : (entity.reviewIntelligence.primaryWarning ?? "No critical warning."),
    secondaryBadNews: profile.locale === 'ar'
      ? entity.reviewIntelligence.secondaryWarningAr
      : entity.reviewIntelligence.secondaryWarning,
    topPros: entity.reviewIntelligence.topPros ?? [],
    excluded,
    specs: {
      performance: entity.specs?.performance ?? 50,
      battery: entity.specs?.battery ?? 50,
      portability: entity.specs?.portability ?? 50,
      build: entity.specs?.display ?? 50 // mapping display to build for radar chart
    },
    media: entity.media,
    decision_confidence: {
      overall: selection.score / 100,
      stability: selection.score > 85 ? 0.95 : 0.7,
      evidence_strength: entity.trust?.sourceConfidence ?? 0.5
    }
  };
}

export function recommendOwnership({ profile, entity, heroCard }) {
  const refurbishedOffer = entity.market.offers.find((offer) => offer.condition === "refurbished");
  const openBoxOffer = entity.market.offers.find((offer) => offer.condition === "open_box");

  if (profile.context?.acceptsRefurbished && refurbishedOffer) {
    return {
      mode: "refurbished_if_verified",
      explanation: "Use refurbished only as an ownership optimization after the device is chosen.",
      recommendedOffer: refurbishedOffer
    };
  }

  if (profile.context?.acceptsOpenBox && openBoxOffer) {
    return {
      mode: "open_box_with_guardrails",
      explanation: "Open-box is allowed as an ownership path, not as a shortcut that changes the decision layer.",
      recommendedOffer: openBoxOffer
    };
  }

  if (profile.context?.financingAllowed && heroCard.priceUsd > profile.budgetUsd * 0.9) {
    return {
      mode: "light_financing",
      explanation: "Financing can be considered because the chosen device sits near the top of budget."
    };
  }

  return {
    mode: "buy_new",
    explanation: "The safest ownership strategy is to buy the verified new offer directly."
  };
}
