import { normalizeId, CARD_TYPES, clamp } from "../../packages/shared-kernel/src/index.js";
import { produceReviewIntelligence } from "../../packages/catalog-review-intelligence/src/index.js";
import { DecisionKernel, DecisionCompiler, DecisionExplainer } from "../../packages/catalog-core/src/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "decision-config.json");
const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

const compiler = new DecisionCompiler();
const kernel = new DecisionKernel();
const explainer = new DecisionExplainer();
const decisionIR = compiler.compile(rawConfig);

function parseCapacity(rawValue) {
  const value = String(rawValue ?? "").toLowerCase();
  const match = value.match(/(\d+(\.\d+)?)/);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  if (value.includes("tb")) {
    return Math.round(amount * 1024);
  }

  return Math.round(amount);
}

function parseNumber(rawValue, fallback = 0) {
  const match = String(rawValue ?? "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : fallback;
}

function normalizeGpuClass(rawGpu) {
  const value = String(rawGpu ?? "").toLowerCase();
  if (value.includes("4070") || value.includes("4080") || value.includes("4090")) return "high_dgpu";
  if (value.includes("4060") || value.includes("4050")) return "mid_dgpu";
  return "integrated";
}

function scoreGpu(gpuClass) {
  if (gpuClass === "high_dgpu") return 100;
  if (gpuClass === "mid_dgpu") return 84;
  return 40;
}

function detectBrand(itemName) {
  const value = String(itemName ?? "").toLowerCase();
  if (value.includes("macbook") || value.includes("apple")) return "apple";
  if (value.includes("thinkpad") || value.includes("lenovo")) return "lenovo";
  if (value.includes("asus")) return "asus";
  if (value.includes("dell")) return "dell";
  if (value.includes("acer")) return "acer";
  if (value.includes("hp")) return "hp";
  if (value.includes("surface") || value.includes("microsoft")) return "microsoft";
  if (value.includes("msi")) return "msi";
  return "unknown";
}

function buildProductImageDataUri({ itemName, variantName, brand }) {
  const palettes = {
    apple: ["#0F2B5B", "#50D5D1"],
    lenovo: ["#17335C", "#66C7BF"],
    asus: ["#102E68", "#4AB7E8"],
    dell: ["#123B78", "#76C2FF"],
    acer: ["#133E6C", "#5ED6C0"],
    hp: ["#164E63", "#3DD7D6"],
    microsoft: ["#1A3768", "#6FDBDB"],
    msi: ["#1C2C5B", "#6F8DFF"],
    unknown: ["#17335C", "#50D5D1"]
  };
  const [start, end] = palettes[brand] ?? palettes.unknown;
  const title = String(itemName ?? "Laptop");
  const subtitle = String(variantName ?? "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="620" viewBox="0 0 960 620">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FBFDFF" />
          <stop offset="100%" stop-color="#EEF5FB" />
        </linearGradient>
        <linearGradient id="screen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="960" height="620" rx="36" fill="url(#bg)" />
      <ellipse cx="490" cy="522" rx="238" ry="28" fill="rgba(15,43,91,0.10)" />
      <g transform="translate(240 120)">
        <rect x="110" y="20" width="420" height="255" rx="22" fill="#DCE6F4" stroke="#B9C7DA" stroke-width="6"/>
        <rect x="132" y="42" width="376" height="211" rx="14" fill="url(#screen)"/>
        <path d="M20 294 L620 294 L546 346 L95 346 Z" fill="#DCE4F0" stroke="#B9C7DA" stroke-width="5"/>
        <path d="M130 318 L510 318" stroke="#B6C5D8" stroke-width="6" stroke-linecap="round"/>
      </g>
      <text x="72" y="86" fill="#122033" font-size="34" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${title}</text>
      <text x="72" y="124" fill="#607086" font-size="22" font-family="Segoe UI, Arial, sans-serif">${subtitle}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function estimateResaleScore({ itemName, specs, trust }) {
  const brand = detectBrand(itemName);
  const brandBase = {
    apple: 96,
    lenovo: 82,
    asus: 76,
    dell: 62,
    unknown: 55
  };

  const performanceLift = clamp((specs.performance - 70) * 0.35, 0, 10);
  const trustLift = clamp((trust.sourceConfidence - 0.8) * 40, 0, 8);
  return clamp((brandBase[brand] ?? 55) + performanceLift + trustLift, 0, 100);
}

function resolveFitContext(observation, segment, fitContexts) {
  const baseline = fitContexts[segment];
  const official = baseline.official;
  const safe = baseline.safe;

  const meetsOfficial =
    observation.specs.ramGb >= official.minRamGb &&
    observation.specs.storageGb >= official.minStorageGb &&
    (!official.needsDedicatedGpu || observation.specs.gpuClass !== "integrated");

  const meetsSafe =
    observation.specs.ramGb >= safe.minRamGb &&
    observation.specs.storageGb >= safe.minStorageGb &&
    (!safe.needsDedicatedGpu || observation.specs.gpuClass !== "integrated");

  return {
    official,
    safe,
    state: meetsSafe ? "meets_safe" : meetsOfficial ? "meets_official" : "below_official"
  };
}

function normalizeDecisionProfile(profile) {
  const sliders = {
    virtualMachines: profile.sliders?.virtual_machines ?? 0,
    video4k: profile.sliders?.video_4k ?? 0,
    gaming: profile.sliders?.gaming ?? 0,
    portability: profile.sliders?.portability ?? 0
  };

  const preferences = {
    portability: profile.preferences?.portability ?? sliders.portability,
    battery: profile.preferences?.battery ?? 0,
    display: profile.preferences?.display ?? 0,
    resale: profile.preferences?.resale ?? 50
  };

  const context = {
    acceptsOpenBox: Boolean(profile.context?.acceptsOpenBox ?? profile.context?.open_box_accepted),
    acceptsRefurbished: Boolean(profile.context?.acceptsRefurbished ?? profile.context?.refurbished_accepted),
    financingAllowed: Boolean(profile.context?.financingAllowed ?? false)
  };

  return {
    ...profile,
    profileId: profile.id ?? profile.profileId ?? "anonymous_profile",
    sliders,
    preferences,
    context
  };
}

function buildSoftRequirements(profile, fit, ruleset) {
  const softRequirements = {
    minRamGb: fit.safe.minRamGb,
    minStorageGb: fit.safe.minStorageGb,
    needsDedicatedGpu: Boolean(fit.safe.needsDedicatedGpu),
    portabilityFloor: 0,
    batteryFloor: 0
  };

  const sliderRules = ruleset.sliderSoftRules ?? {};

  if (profile.sliders.virtualMachines >= 70 && sliderRules.virtual_machines?.gte_70) {
    softRequirements.minRamGb = Math.max(
      softRequirements.minRamGb,
      sliderRules.virtual_machines.gte_70.softMinRamGb ?? 0
    );
    softRequirements.minStorageGb = Math.max(
      softRequirements.minStorageGb,
      sliderRules.virtual_machines.gte_70.softMinStorageGb ?? 0
    );
  }

  if (profile.sliders.video4k >= 70 && sliderRules.video_4k?.gte_70) {
    softRequirements.needsDedicatedGpu =
      softRequirements.needsDedicatedGpu ||
      Boolean(sliderRules.video_4k.gte_70.softNeedsDedicatedGpu);
    softRequirements.minRamGb = Math.max(
      softRequirements.minRamGb,
      sliderRules.video_4k.gte_70.softMinRamGb ?? 0
    );
  }

  if (profile.sliders.gaming >= 70 && sliderRules.gaming?.gte_70) {
    softRequirements.needsDedicatedGpu =
      softRequirements.needsDedicatedGpu ||
      Boolean(sliderRules.gaming.gte_70.softNeedsDedicatedGpu);
  }

  if (profile.sliders.portability >= 70 && sliderRules.portability?.gte_70) {
    softRequirements.batteryFloor = sliderRules.portability.gte_70.softMinBatteryScore ?? 0;
    softRequirements.portabilityFloor = sliderRules.portability.gte_70.softMinPortabilityScore ?? 0;
  }

  return softRequirements;
}

function scoreHeadroom(actualValue, targetValue) {
  if (targetValue <= 0) {
    return 100;
  }

  return clamp((actualValue / targetValue) * 100);
}

function chooseOffer(entity, profile) {
  const offers = [...entity.market.offers].sort((left, right) => left.priceUsd - right.priceUsd);
  const allowedOffers = offers.filter((offer) => {
    if (offer.condition === "open_box") {
      return profile.context.acceptsOpenBox;
    }

    if (offer.condition === "refurbished") {
      return profile.context.acceptsRefurbished;
    }

    return true;
  });

  const baselineOffer = allowedOffers[0] ?? entity.market.bestOffer ?? offers[0] ?? null;
  const heroOffer = allowedOffers.find((offer) => offer.condition !== "open_box") ??
    offers.find((offer) => offer.condition !== "open_box") ??
    baselineOffer;

  return {
    baselineOffer,
    heroOffer
  };
}

function summarizeExclusions(exclusionReasons) {
  const uniqueReasons = [...new Set(exclusionReasons)];
  if (!uniqueReasons.length) {
    return "No eligible device remained after applying the current rules.";
  }

  return `No eligible device remained after applying these constraints: ${uniqueReasons.join(", ")}.`;
}

function rankCandidates(entries, tieBreakersOrder) {
  const tieBreakers = tieBreakersOrder ?? [];

  const extractTieBreaker = (entry, key) => {
    if (key === "lower_risk") return -(entry.penaltyScore ?? 0);
    if (key === "higher_headroom") return entry.headroomScore ?? 0;
    if (key === "higher_trust") return entry.componentScores?.trust ?? 0;
    if (key === "higher_resale") return entry.componentScores?.resale ?? 0;
    if (key === "lower_price") return -(entry.selectedOffer?.priceUsd ?? Number.POSITIVE_INFINITY);
    return 0;
  };

  return [...entries].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    for (const tieBreaker of tieBreakers) {
      const delta = extractTieBreaker(right, tieBreaker) - extractTieBreaker(left, tieBreaker);
      if (delta !== 0) {
        return delta;
      }
    }

    return left.entity.entityId.localeCompare(right.entity.entityId);
  });
}

export const laptopStudentUsDomainPack = {
  meta: {
    domainId: "laptop-student-us",
    version: "2.0.0",
    identityRules: decisionIR.identityRules,
    entityType: "laptop_variant",
    segmentKey: "major",
    scope: "student laptop buying decisions in the US"
  },

  cardTypes: CARD_TYPES,

  acquireRawObservation(sourceRecord) {
    return {
      sourceId: sourceRecord.sourceId,
      sourceType: sourceRecord.sourceType,
      sourceName: sourceRecord.sourceName,
      sourceUrl: sourceRecord.sourceUrl,
      payload: sourceRecord,
      capturedAt: new Date().toISOString()
    };
  },

  normalizeAcquiredObservation(rawObservation) {
    const sourceRecord = rawObservation.payload;

    // دعم البنيتين: البنية الخام (rawSpecs) والبنية المُطبّعة مسبقاً (specs)
    const hasRawSpecs = Boolean(sourceRecord.rawSpecs);

    const specs = hasRawSpecs
      ? {
          platform:    sourceRecord.rawSpecs.cpu ?? "unknown",
          ramGb:       parseCapacity(sourceRecord.rawSpecs.ram),
          storageGb:   parseCapacity(sourceRecord.rawSpecs.storage),
          gpuClass:    normalizeGpuClass(sourceRecord.rawSpecs.gpu),
          performance: Number(sourceRecord.rawSpecs.performance_score),
          display:     Number(sourceRecord.rawSpecs.display_score),
          battery:     Number(sourceRecord.rawSpecs.battery_score),
          portability: Number(sourceRecord.rawSpecs.portability_score),
          thermals:    Number(sourceRecord.rawSpecs.thermals_score)
        }
      : {
          platform:    sourceRecord.specs?.platform ?? sourceRecord.specs?.cpu ?? "unknown",
          ramGb:       Number(sourceRecord.specs?.ramGb     ?? 0),
          storageGb:   Number(sourceRecord.specs?.storageGb  ?? 0),
          gpuClass:    sourceRecord.specs?.gpuClass  ?? "integrated",
          performance: Number(sourceRecord.specs?.performance ?? 0),
          display:     Number(sourceRecord.specs?.display     ?? 0),
          battery:     Number(sourceRecord.specs?.battery     ?? 0),
          portability: Number(sourceRecord.specs?.portability ?? 0),
          thermals:    Number(sourceRecord.specs?.thermals    ?? 0)
        };

    const reviewSummary = hasRawSpecs
      ? {
          topCons:         sourceRecord.reviewEvidence?.topCons ?? [],
          reviewRiskScore: sourceRecord.reviewEvidence?.reviewRiskScore ?? 0
        }
      : {
          topCons:         sourceRecord.reviewSummary?.topCons ?? [],
          topPros:         sourceRecord.reviewSummary?.topPros ?? [],
          userSignals:     sourceRecord.reviewSummary?.userSignals ?? [],
          reviewRiskScore: sourceRecord.reviewSummary?.reviewRiskScore ?? 0,
          sentiment:       sourceRecord.reviewSummary?.sentiment ?? "neutral"
        };

    const trust = hasRawSpecs
      ? {
          sourceConfidence: sourceRecord.trustEvidence?.sourceConfidence ?? 0.5,
          reviewCoverage:   sourceRecord.reviewEvidence?.reviewCoverage  ?? 0,
          freshnessDays:    sourceRecord.trustEvidence?.freshnessDays    ?? 30
        }
      : {
          sourceConfidence: sourceRecord.trust?.sourceConfidence ?? 0.5,
          reviewCoverage:   sourceRecord.trust?.reviewCoverage   ?? 0,
          freshnessDays:    sourceRecord.trust?.freshnessDays    ?? 30
        };

    return {
      sourceName:      sourceRecord.sourceName,
      sourceUrl:       sourceRecord.sourceUrl,
      observationType: sourceRecord.observationType
        ?? `${sourceRecord.sourceType ?? "unknown"}_catalog_snapshot`,
      itemName:     sourceRecord.itemName,
      variantName:  sourceRecord.variantName,
      majorSignals: sourceRecord.majorSignals ?? [],
      specs,
      reviewSummary,
      trust,
      offers:       sourceRecord.offers ?? []
    };
  },

  publishEntity(observation, { fitContexts, resolvedSpecs = null }) {
    const specs = resolvedSpecs || observation.specs;
    const entityId = normalizeId(observation.itemName, observation.variantName);
    const offers = [...observation.offers].sort((left, right) => left.priceUsd - right.priceUsd);
    const bestOffer = offers[0];
    const resaleScore = estimateResaleScore({
      itemName: observation.itemName,
      specs: specs,
      trust: observation.trust
    });
    const brand = detectBrand(observation.itemName);

    return {
      entityId,
      entityType: "laptop_variant",
      title: `${observation.itemName} - ${observation.variantName}`,
      itemName: observation.itemName,
      variantName: observation.variantName,
      brand,
      segmentSignals: observation.majorSignals,
      specs: specs,
      market: {
        bestOffer,
        offers
      },
      trust: {
        sourceConfidence: observation.trust.sourceConfidence,
        reviewCoverage: observation.trust.reviewCoverage,
        freshnessDays: observation.trust.freshnessDays,
        confidenceLevel:
          observation.trust.sourceConfidence >= 0.9 ? "high" :
            observation.trust.sourceConfidence >= 0.8 ? "medium" :
              "low"
      },
      reviewIntelligence: {
        ...produceReviewIntelligence({
          topCons: observation.reviewSummary?.topCons ?? [],
          reviewRiskScore: observation.reviewSummary?.reviewRiskScore ?? 0
        }),
        topPros: observation.reviewSummary?.topPros ?? [],
        userSignals: observation.reviewSummary?.userSignals ?? []
      },
      economicSignals: {
        resaleScore
      },
      media: {
        experience: {
          inspection_mode: "parallax",
          aura: {
            performance_bias: (specs.performance ?? 0) / 100,
            mobility_bias: (specs.portability ?? 0) / 100,
            thermal_intensity: 1 - ((specs.thermals ?? 50) / 100),
            confidence: observation.trust?.sourceConfidence ?? 0.5
          },
          hotspots: (observation.reviewSummary?.topPros ?? []).map((pro, index) => ({
             id: `pro-${index}`,
             type: 'pro',
             label: pro,
             // Simple heuristic for demo: map known keywords to coordinates
             x: pro.toLowerCase().includes('screen') || pro.toLowerCase().includes('display') ? 50 : 
                pro.toLowerCase().includes('keyboard') || pro.toLowerCase().includes('trackpad') ? 50 : 
                pro.toLowerCase().includes('port') || pro.toLowerCase().includes('usb') ? 20 : 80,
             y: pro.toLowerCase().includes('screen') || pro.toLowerCase().includes('display') ? 30 : 
                pro.toLowerCase().includes('keyboard') || pro.toLowerCase().includes('trackpad') ? 70 : 
                pro.toLowerCase().includes('port') || pro.toLowerCase().includes('usb') ? 85 : 50
          }))
        },
        assets: {
          productImage: buildProductImageDataUri({
            itemName: observation.itemName,
            variantName: observation.variantName,
            brand
          }),
          hero_render: null,
          model: { glb: null, poster: null }
        }
      },
      fitStates: Object.fromEntries(
        Object.keys(fitContexts).map((segment) => [
          segment,
          resolveFitContext({ ...observation, specs }, segment, fitContexts)
        ])
      ),
      publishedAt: new Date().toISOString()
    };
  },

  entityFitsProfile(entity, profile) {
    return Boolean(entity.fitStates[profile.major]);
  },



  /**
   * Layer 5 Delegate — Pre-Publish Fit Gate
   *
   * يُحدد إذا كانت observation تستحق الدخول للكتالوج المنشور.
   *
   * القاعدة: يجب أن يجتاز المنتج الحدَّ الأدنى "official" لتخصص واحد على الأقل.
   * إذا فشل في جميع التخصصات → يُحذف. المحرك لن يراه أصلاً.
   *
   * يُعيد: { passed: boolean, failedSegments: string[] }
   * ← هذا الشكل الموسّع يتيح لـ filterByFitContexts التوثيق الكامل.
   */
  meetsMinimumFitContext(observation, fitContexts) {
    const specs = observation.specs;
    if (!specs) return { passed: false, failedSegments: Object.keys(fitContexts) };

    const failedSegments = [];

    for (const [segment, baseline] of Object.entries(fitContexts)) {
      const official = baseline.official ?? {};
      const meetsRam     = !official.minRamGb     || (specs.ramGb     >= official.minRamGb);
      const meetsStorage = !official.minStorageGb  || (specs.storageGb >= official.minStorageGb);
      const meetsGpu     = !official.needsDedicatedGpu || (specs.gpuClass !== "integrated");

      if (meetsRam && meetsStorage && meetsGpu) {
        // يكفي اجتياز تخصص واحد للقبول في الكتالوج
        return { passed: true, failedSegments };
      }
      failedSegments.push(segment);
    }

    return { passed: false, failedSegments };
  },

  detectIntentConflicts({ profile, ruleset }) {
    const conflicts = [];
    const { sliders } = profile;

    // 1. Performance vs Portability (The Physics Conflict)
    if (sliders.performance > 75 && sliders.portability > 75) {
      conflicts.push({
        id: "phys_limit_perf_port",
        type: "dimensional_tension",
        gravity: 0.85,
        description: lang === 'AR' ? "تعارض مادي: الأداء العالي يتطلب تبريداً يزيد من الوزن." : "Physical tension: High performance requires cooling that increases weight.",
        dimensions: ["performance", "portability"]
      });
    }

    // 2. Budget vs Ambition (The Economic Conflict)
    if (sliders.performance > 80 && profile.budgetUsd < 1000) {
      conflicts.push({
        id: "econ_tension_perf_price",
        type: "economic_tension",
        gravity: 0.92,
        description: lang === 'AR' ? "تعارض ميزانية: الأداء المطلوب يتجاوز سقف السعر الحالي." : "Budget tension: Required performance exceeds current price ceiling.",
        dimensions: ["performance", "price"]
      });
    }

    return conflicts;
  },

  attemptRecovery({ profile, catalog, ruleset }) {
    // Law of Semantic Drift: Relaxing constraints to avoid zero results
    let relaxationScore = 0;
    let currentProfile = { ...profile };

    // Step 1: Relax "Safe" fit to "Official" fit (15% relaxation)
    relaxationScore = 0.15;
    const officialEntities = catalog.matchingProfile({ ...currentProfile, useOfficialFit: true });
    
    if (officialEntities.length > 0) {
      const candidates = officialEntities.map(e => this.evaluateCandidate({ profile: currentProfile, entity: e, ruleset, catalog }));
      return { relaxationScore, candidates };
    }

    // Step 2: Relax Budget by 20% (Adding 0.20 to score)
    relaxationScore = 0.35; // Total relaxation > 30% -> TRIGGER COGNITIVE COLLAPSE in Engine
    return { relaxationScore, candidates: [] };
  },

  evaluateCandidate({ profile, entity, ruleset, catalog }) {
    const flattenedEntity = {
        ...entity,
        price: entity.market?.bestOffer?.priceUsd ?? 9999,
        battery: entity.specs?.battery ?? 0,
        weight: entity.specs?.weight ?? 2,
        performance: entity.specs?.performance ?? 0,
        ramGb: entity.specs?.ramGb ?? 0,
        display: entity.specs?.display ?? 0,
        thermals: entity.specs?.thermals ?? 50
    };

    const kernelResult = kernel.execute(decisionIR, [flattenedEntity], { 
      budget: profile.budgetUsd,
      major: profile.major 
    }, {
      targetScoreId: rawConfig.rulesets[profile.major] ? `score_${profile.major}` : "score_general"
    });

    const result = kernelResult.results[0];
    const trace = result.trace;

    // Law of Sacrifice: Quantify what was lost to gain the win
    const sacrificeVector = {
      price: (profile.budgetUsd - flattenedEntity.price) / profile.budgetUsd,
      performance: (flattenedEntity.performance - 70) / 30,
      portability: (flattenedEntity.portability - 70) / 30
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
      fitState: entity.fitStates[profile.major]?.state ?? "unknown"
    };
  },

  buildNoResults({ profile, evaluatedCandidates, status, relaxationScore }) {
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
  },

  chooseCard(cardType, eligibleCandidates) {
    if (!eligibleCandidates.length) return null;
    const sorted = [...eligibleCandidates].sort((a, b) => b.score - a.score);
    if (cardType === "hero") return sorted[0];
    if (cardType === "smart_budget") {
        return [...eligibleCandidates].sort((a, b) => 
            (a.entity.market.bestOffer?.priceUsd ?? 9999) - (b.entity.market.bestOffer?.priceUsd ?? 9999)
        )[0];
    }
    return sorted[1] || sorted[0];
  },

  buildCard(cardType, selection, profile) {
    const entity = selection.entity;
    return {
      cardType,
      entityId: entity.entityId,
      title: entity.title,
      priceUsd: entity.market.bestOffer?.priceUsd ?? 0,
      score: selection.score,
      match: selection.score,
      sacrificeVector: selection.sacrificeVector,
      whyThis: explainer.explain(selection.trace, entity.title),
      badNews: entity.reviewIntelligence.primaryWarning ?? "No critical warning.",
      topPros: entity.reviewIntelligence.topPros ?? [],
      media: entity.media,
      decision_confidence: {
        overall: selection.score / 100,
        stability: selection.score > 85 ? 0.95 : 0.7,
        evidence_strength: entity.trust?.sourceConfidence ?? 0.5
      }
    };
  },



  recommendOwnership({ profile, entity, heroCard }) {
    const refurbishedOffer = entity.market.offers.find((offer) => offer.condition === "refurbished");
    const openBoxOffer = entity.market.offers.find((offer) => offer.condition === "open_box");

    if (profile.context.acceptsRefurbished && refurbishedOffer) {
      return {
        mode: "refurbished_if_verified",
        explanation: "Use refurbished only as an ownership optimization after the device is chosen.",
        recommendedOffer: refurbishedOffer
      };
    }

    if (profile.context.acceptsOpenBox && openBoxOffer) {
      return {
        mode: "open_box_with_guardrails",
        explanation: "Open-box is allowed as an ownership path, not as a shortcut that changes the decision layer.",
        recommendedOffer: openBoxOffer
      };
    }

    if (profile.context.financingAllowed && heroCard.priceUsd > profile.budgetUsd * 0.9) {
      return {
        mode: "light_financing",
        explanation: "Financing can be considered because the chosen device sits near the top of budget."
      };
    }

    return {
      mode: "buy_new",
      explanation: "The safest ownership strategy is to buy the verified new offer directly."
    };
  },

  /**
   * بصمة فريدة للابتوبات، تُستخدم بواسطة catalog-identity لدمج السجلات المتكررة.
   * تعتمد على المواصفات التقنية الجوهرية وليس على الاسم التجاري المتغير.
   */
  buildEntityFingerprint(observation) {
    const brand   = detectBrand(observation.itemName ?? "");
    const ram     = String(observation.specs?.ramGb     ?? 0);
    const storage = String(observation.specs?.storageGb ?? 0);
    const gpu     = (observation.specs?.gpuClass ?? "unk").toLowerCase();
    // نستخدم الاسم المُطبّع للمنتج مع إزالة أرقام النسخ للمرونة
    const name    = (observation.itemName ?? "").toLowerCase()
      .replace(/gen\s*\d+/gi, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .trim();

    return `${brand}__${name}__${ram}gb__${storage}gb__${gpu}`;
  },

  /**
   * حسم الحقول عند تعارض المصادر لنفس الكيان.
   * الاستراتيجية: الوزن المرجّح بـ sourceConfidence (المصادر الأعلى ثقةً تؤثر أكثر).
   */
  resolveEntityFields(observations) {
    const totalWeight = observations.reduce((sum, obs) => sum + (obs.trust?.sourceConfidence ?? 0.5), 0) || 1;

    function weightedAvg(key) {
      const weighted = observations.reduce((sum, obs) => {
        const val    = obs.specs?.[key];
        const weight = obs.trust?.sourceConfidence ?? 0.5;
        return typeof val === "number" ? sum + val * weight : sum;
      }, 0);
      const denominator = observations.reduce((sum, obs) => {
        const val = obs.specs?.[key];
        return typeof val === "number" ? sum + (obs.trust?.sourceConfidence ?? 0.5) : sum;
      }, 0) || 1;
      return Math.round(weighted / denominator);
    }

    const resolvedSpecs = {
      ramGb:       weightedAvg("ramGb"),
      storageGb:   weightedAvg("storageGb"),
      performance: weightedAvg("performance"),
      display:     weightedAvg("display"),
      battery:     weightedAvg("battery"),
      portability: weightedAvg("portability"),
      thermals:    weightedAvg("thermals"),
      // للحقول النصية: نأخذ من المصدر الأعلى ثقةً
      gpuClass: observations.reduce((best, obs) => {
        return (obs.trust?.sourceConfidence ?? 0) > (best.trust?.sourceConfidence ?? 0) ? obs : best;
      }, observations[0])?.specs?.gpuClass ?? "integrated"
    };

    const avgConfidence = totalWeight / observations.length;

    return {
      resolvedSpecs,
      confidence: Math.min(1, avgConfidence),
      observationCount: observations.length,
      trustSignals: {
        status: avgConfidence >= 0.80 ? "trusted" : avgConfidence >= 0.60 ? "moderate" : "low_trust",
        avgSourceConfidence: avgConfidence,
        sourceCount: new Set(observations.map((obs) => obs._acquisition?.sourceId ?? obs.sourceName ?? "unknown")).size
      }
    };
  },

  buildGrowthArtifacts({ profile, decision }) {
    const hero = decision.cards.find((card) => card.cardType === "hero");
    return {
      seoPagePayload: {
        slug: `${profile.major}-best-laptops`,
        title: `Best laptops for ${profile.major} students`,
        description: "Structured search surface generated from decision outputs and the published catalog."
      },
      shareArtifact: hero
        ? {
          type: "recommendation_snapshot",
          headline: `Recommended hero for ${profile.major} students`,
          title: hero.title,
          priceUsd: hero.priceUsd
        }
        : null
    };
  }
};
