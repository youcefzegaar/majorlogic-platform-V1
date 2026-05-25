// detectIntentConflicts, attemptRecovery, detectArchetype, buildGrowthArtifacts
import { evaluateCandidate } from "./scoring.js";

/**
 * Conflict gravity values are market-observed correlations, NOT physical laws.
 * Each has a confidence level and trend direction so the UI can present them
 * as hypotheses rather than absolutes. When new device generations break a
 * pattern (e.g., ARM laptops with high performance + low weight), the
 * correlation weakens and the description updates accordingly.
 *
 * Structure:
 *   gravity       — current observed correlation strength (0–1)
 *   confidence    — how certain we are of this correlation (0–1)
 *   trend         — "stable" | "weakening" | "strengthening"
 *   sample_period — market window this was calibrated on
 */

export function detectIntentConflicts({ profile, ruleset }) {
  const insights = [];
  const { sliders, preferences, major, budgetUsd } = profile;

  // 1. Major vs Budget — Economic constraint
  const demandingMajors = ["engineering", "design", "ai"];
  if (demandingMajors.includes(major) && budgetUsd < 850) {
    insights.push({
      id: "econ_major_bottleneck",
      type: "conflict",
      gravity: 0.95,
      confidence: 0.91,
      trend: "stable",
      sample_period: "2024-2026",
      dimensions: ["budget", "major"],
      title: "Economic Bottleneck",
      description: `Your major (${major.toUpperCase()}) typically requires significant processing and graphics power. At $${budgetUsd}, the available catalog is constrained to economy-tier devices — an almost certain compromise in longevity or peak performance.`
    });
  }

  // 2. Performance vs Portability — thermally driven, but weakening
  if (sliders.performance > 75 && sliders.portability > 75) {
    insights.push({
      id: "phys_limit_perf_port",
      type: "conflict",
      gravity: 0.82,
      confidence: 0.76,
      trend: "weakening",
      sample_period: "2024-2026",
      dimensions: ["performance", "portability"],
      title: "Performance–Portability Tension",
      description: "In most current x86 laptops, high performance still correlates with heavier chassis due to cooling requirements. Some 2025 designs (ARM-based, vapor-chamber) are beginning to challenge this pattern — but in the mainstream market it remains a real trade-off today."
    });
  }

  // 3. Performance vs Battery — power budget constraint
  if (sliders.performance > 80 && preferences.battery > 70) {
    insights.push({
      id: "power_tax_perf_batt",
      type: "conflict",
      gravity: 0.78,
      confidence: 0.84,
      trend: "stable",
      sample_period: "2024-2026",
      dimensions: ["performance", "battery"],
      title: "Performance–Battery Trade-off",
      description: "High-performance components draw significantly more power. In the current market, combining all-day battery with peak performance typically requires either a larger battery (adding weight) or performance caps under load. This correlation is stable across 2024–2026 mainstream devices."
    });
  }

  // 4. Strategic Harmony — CS + VM alignment
  if (["cs", "ai"].includes(major) && sliders.virtual_machines >= 70 && sliders.performance >= 75) {
    insights.push({
      id: "harmony_cs_setup",
      type: "harmony",
      gravity: 0.90,
      confidence: 0.88,
      trend: "stable",
      sample_period: "2024-2026",
      dimensions: ["major", "performance"],
      title: "Strategic Alignment",
      description: "Your performance and VM allocation closely match what CS/AI workloads actually demand — this is a well-calibrated profile with low risk of over- or under-speccing."
    });
  }

  // 5. Investment Harmony — Premium Ultrabook path
  if (budgetUsd > 1400 && preferences.battery > 60 && sliders.portability > 60 && sliders.performance <= 70) {
    insights.push({
      id: "harmony_premium_ultra",
      type: "harmony",
      gravity: 0.85,
      confidence: 0.82,
      trend: "stable",
      sample_period: "2024-2026",
      dimensions: ["budget", "portability"],
      title: "Smart Investment Path",
      description: "High budget focused on battery and portability (rather than peak performance) is well-aligned with premium ultrabooks — devices that consistently show strong longevity and high resale retention in this price tier."
    });
  }

  // 6. Overkill Risk
  if (["general", "medical"].includes(major) && sliders.performance > 85 && budgetUsd > 1500) {
    insights.push({
      id: "risk_overkill",
      type: "risk",
      gravity: 0.70,
      confidence: 0.75,
      trend: "stable",
      sample_period: "2024-2026",
      dimensions: ["major", "budget"],
      title: "Potential Resource Mismatch",
      description: "Based on typical workloads for this major, this performance level exceeds observed needs. Budget redirected toward display quality or portability would likely deliver more day-to-day value."
    });
  }

  return insights;
}

export function attemptRecovery({ profile, catalog, ruleset }) {
  const relaxationAttempts = [
    {
      name: 'loosen_fit_context',
      weight: 0.10,
      modify: (p) => ({ ...p, useOfficialFit: true }),
      description: 'Allow official-fit devices instead of safe-fit only'
    },
    {
      name: 'expand_budget',
      weight: 0.15,
      modify: (p) => ({ ...p, budgetUsd: (p.budgetUsd || 9999) * 1.15 }),
      description: 'Expand budget by 15%'
    },
    {
      name: 'reduce_performance',
      weight: 0.12,
      modify: (p) => ({ ...p, preferences: { ...p.preferences, performance: (p.preferences?.performance || 50) * 0.85 } }),
      description: 'Reduce performance requirement by 15%'
    },
    {
      name: 'reduce_portability',
      weight: 0.08,
      modify: (p) => ({ ...p, preferences: { ...p.preferences, portability: (p.preferences?.portability || 50) * 0.80 } }),
      description: 'Reduce portability requirement by 20%'
    }
  ];

  let cumulativeRelaxation = 0;
  let bestCandidates = null;
  let appliedRelaxations = [];

  for (const attempt of relaxationAttempts) {
    cumulativeRelaxation += attempt.weight;

    // Stop if we've relaxed >30% — cognitive collapse territory
    if (cumulativeRelaxation > 0.30) {
      console.warn('[RECOVERY] Relaxation exceeded 30%. Cognitive collapse imminent.');
      break;
    }

    const relaxedProfile = attempt.modify({ ...profile });
    const candidates = catalog.matchingProfile(relaxedProfile);

    if (candidates.length > 0) {
      const evaluated = candidates.map(e => evaluateCandidate({
        profile: relaxedProfile,
        entity: e,
        ruleset,
        catalog
      }));

      bestCandidates = evaluated;
      appliedRelaxations.push({
        attempt: attempt.name,
        description: attempt.description,
        weight: attempt.weight,
        resultCount: candidates.length
      });

      if (candidates.length >= 3) {
        return {
          relaxationScore: cumulativeRelaxation,
          candidates: evaluated,
          relaxations: appliedRelaxations,
          negotiable: true
        };
      }
    }
  }

  if (bestCandidates) {
    return {
      relaxationScore: cumulativeRelaxation,
      candidates: bestCandidates,
      relaxations: appliedRelaxations,
      negotiable: true
    };
  }

  return {
    relaxationScore: cumulativeRelaxation,
    candidates: [],
    relaxations: appliedRelaxations,
    cognitiveCollapse: true,
    message: 'No viable devices found even with maximum relaxation'
  };
}

export function detectArchetype(profile, decision) {
  const budget = profile.budgetUsd || 1000;
  if (budget < 800) return { id: "budget_conscious", label: "Budget Conscious" };
  if (profile.major === "engineering" || profile.major === "design") return { id: "power_user", label: "Power User" };
  return { id: "balanced", label: "Balanced Choice" };
}

export function buildGrowthArtifacts({ profile, decision }) {
  const hero = decision.cards.find((card) => card.cardType === "hero");
  const archetype = detectArchetype(profile, decision);

  return {
    seoPagePayload: {
      slug: `${profile.major}-${archetype.id}-best-laptops`,
      title: `Best ${archetype.label} Laptops for ${profile.major} Students`,
      description: `Expert recommendation for ${profile.major} students matching the ${archetype.label} profile.`,
      keywords: [profile.major, archetype.id, "laptop", "student", "recommendation"]
    },
    shareArtifact: hero
      ? {
        type: "recommendation_snapshot",
        headline: `Recommended for ${profile.major} (${archetype.label})`,
        title: hero.title,
        priceUsd: hero.priceUsd,
        tcoEstimate: hero.economicSignals?.tcoEstimate
      }
      : null
  };
}
