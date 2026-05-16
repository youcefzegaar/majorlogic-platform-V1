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

function resolveSellerTier(offer) {
  if (!offer) return 4; // Unknown
  const type = offer.sellerType;
  const cond = offer.condition;
  const seller = String(offer.seller ?? "").toLowerCase();

  if (type === "brand_direct") return 1;
  if (type === "retailer") return 1;
  if (type === "certified_reseller") return 2;
  
  if (type === "marketplace") {
    if (cond === "new") return 2;
    return 4; // Risky marketplace refurbished/open-box
  }

  // Robust fallback for known retailers if type is missing in source
  const knownTier1 = ["amazon", "best buy", "b&h", "newegg", "walmart", "target", "micro center"];
  const knownBrands = ["apple", "lenovo", "dell", "hp", "asus", "acer", "msi", "microsoft", "framework"];
  
  if (knownTier1.includes(seller)) return 2; // Treat known retailers as Tier 2 if type unknown
  if (knownBrands.includes(seller)) return 1; // Treat known brands as Tier 1 if type unknown

  return 3;
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
        offers,
        sellerTier: resolveSellerTier(bestOffer)
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
        resaleScore: specs.resale ?? 50,
        tcoEstimate: calculateTCO({ market: { bestOffer }, specs })
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
    if (!entity.fitStates[profile.major]) return false;
    
    // Tiered Trust System: Only Tier 1, 2 & 3 allowed in v1 production
    const tier = entity.market?.sellerTier ?? 4;
    if (tier > 3) return false;

    // Budget gate: only include devices within budget range
    const price = entity.market?.bestOffer?.priceUsd ?? 9999;
    if (profile.budgetUsd && price > profile.budgetUsd * 1.15) return false; // 15% tolerance
    return true;
  },

  isWithinBudget(entity, profile) {
    const price = entity.market?.bestOffer?.priceUsd ?? 9999;
    return price <= (profile.budgetUsd || 9999) * 1.15;
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
    const insights = [];
    const { sliders, preferences, major, budgetUsd } = profile;
    const lang = profile.locale === 'ar' ? 'AR' : 'EN';

    // 1. Major vs Budget (Economic Risk / Sacrifice)
    const demandingMajors = ["engineering", "design", "ai"];
    if (demandingMajors.includes(major) && budgetUsd < 850) {
      insights.push({
        id: "econ_major_bottleneck",
        type: "conflict",
        gravity: 0.95,
        dimensions: ["budget", "major"],
        title: lang === 'AR' ? "عنق زجاجة مالي" : "Economic Bottleneck",
        description: lang === 'AR' ? `تخصصك (${major.toUpperCase()}) يتطلب قدرة معالجة ورسوميات عالية، لكن الميزانية الحالية (${budgetUsd}$) تقيد الخيارات بالأجهزة الاقتصادية، مما يعني تضحية حتمية في دورة حياة الجهاز.` : `Your major (${major.toUpperCase()}) requires high processing/graphics power, but your budget ($${budgetUsd}) restricts you to economy devices, meaning an inevitable sacrifice in longevity.`
      });
    }

    // 2. Physics Law: Performance vs Portability
    if (sliders.performance > 75 && sliders.portability > 75) {
      insights.push({
        id: "phys_limit_perf_port",
        type: "conflict",
        gravity: 0.88,
        dimensions: ["performance", "portability"],
        title: lang === 'AR' ? "قانون الفيزياء الحرارية" : "Law of Thermal Physics",
        description: lang === 'AR' ? "طلبك لأداء فائق مع تصميم خفيف ومحمول سيؤدي إلى تقييد حراري (Thermal Throttling) للوصول لوزن خفيف، أو زيادة هائلة في السعر لهندسة التبريد." : "Demanding extreme performance in a highly portable design leads to thermal throttling or a massive price spike for advanced cooling engineering."
      });
    }

    // 3. Power Tax: Performance vs Battery
    if (sliders.performance > 80 && preferences.battery > 70) {
      insights.push({
        id: "power_tax_perf_batt",
        type: "conflict",
        gravity: 0.82,
        dimensions: ["performance", "battery"],
        title: lang === 'AR' ? "ضريبة الطاقة" : "Power Tax",
        description: lang === 'AR' ? "المكونات ذات الأداء المطلق تستهلك موارد طاقة ضخمة بشراهة. المطالبة ببطارية طويلة الأمد مع هذا الأداء تُشكل تضحية متبادلة لا مفر منها." : "Absolute performance components consume massive power. Demanding all-day battery life with this performance is an unavoidable mutual sacrifice."
      });
    }

    // 4. Strategic Harmony: Code/AI + VM Setup
    if (["cs", "ai"].includes(major) && sliders.virtual_machines >= 70 && sliders.performance >= 75) {
      insights.push({
        id: "harmony_cs_setup",
        type: "harmony",
        gravity: 0.90,
        dimensions: ["major", "performance"],
        title: lang === 'AR' ? "تناغم استراتيجي" : "Strategic Alignment",
        description: lang === 'AR' ? "تخصيصك العالي للأداء والآلات الوهمية يتطابق تماماً مع طبيعة التخصص البرمجي ويضمن لك بيئة تطوير مستقرة وخالية من الانهيارات." : "Your high allocation for performance and virtual machines perfectly aligns with your programming major, ensuring a rock-solid development environment."
      });
    }

    // 5. Investment Harmony: Premium Ultrabook Path
    if (budgetUsd > 1400 && preferences.battery > 60 && sliders.portability > 60 && sliders.performance <= 70) {
      insights.push({
        id: "harmony_premium_ultra",
        type: "harmony",
        gravity: 0.85,
        dimensions: ["budget", "portability"],
        title: lang === 'AR' ? "مسار استثماري ذكي" : "Smart Investment Path",
        description: lang === 'AR' ? "الميزانية المرتفعة مع التركيز على جودة البطارية والوزن تفتح مساراً ممتازاً نحو أجهزة الفئة العُليا (Premium Ultrabooks) التي تدوم لسنوات طويلة." : "A high budget focused on battery and portability opens an excellent path toward Premium Ultrabooks that boast exceptional longevity."
      });
    }

    // 6. Overkill Risk: Resource Waste
    if (["general", "medical"].includes(major) && sliders.performance > 85 && budgetUsd > 1500) {
      insights.push({
        id: "risk_overkill",
        type: "risk",
        gravity: 0.70,
        dimensions: ["major", "budget"],
        title: lang === 'AR' ? "إهدار الموارد المحتمل" : "Potential Resource Waste",
        description: lang === 'AR' ? "طبيعة تخصصك لا تتطلب هذا المستوى الهائل من الأداء. المحرك يقترح إعادة توجيه الميزانية نحو جودة الشاشة أو خفة الوزن للحصول على قيمة حقيقية." : "Your major doesn't strictly require this massive level of performance. The engine suggests redirecting budget toward screen quality or portability for real value."
      });
    }

    return insights;
  },

  attemptRecovery({ profile, catalog, ruleset }) {
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

      // Law of Semantic Drift: Stop if we've relaxed >30%
      if (cumulativeRelaxation > 0.30) {
        console.warn('[RECOVERY] Relaxation exceeded 30%. Cognitive collapse imminent.');
        break;
      }

      const relaxedProfile = attempt.modify({ ...profile });
      const candidates = catalog.matchingProfile(relaxedProfile);

      if (candidates.length > 0) {
        const evaluated = candidates.map(e => this.evaluateCandidate({ 
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

        // Early exit if we found good options
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
  },

  evaluateCandidate({ profile, entity, ruleset, catalog }) {
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

  chooseCard(cardType, eligibleCandidates, profile, ruleset, ctx) {
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
      // Highest specs ceiling (RAM + storage + performance)
      return [...available].sort((a, b) => {
        const specA = (a.entity.specs?.ramGb || 0) + (a.entity.specs?.performance || 0) + ((a.entity.specs?.storageGb || 0) / 100);
        const specB = (b.entity.specs?.ramGb || 0) + (b.entity.specs?.performance || 0) + ((b.entity.specs?.storageGb || 0) / 100);
        return specB - specA;
      })[0];
    }
    return available[0];
  },

  async buildCard(cardType, selection, profile, ctx = {}) {
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
    const archetype = this.detectArchetype(profile, decision);

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
  },

  detectArchetype(profile, decision) {
    const budget = profile.budgetUsd || 1000;
    if (budget < 800) return { id: "budget_conscious", label: "Budget Conscious" };
    if (profile.major === "engineering" || profile.major === "design") return { id: "power_user", label: "Power User" };
    return { id: "balanced", label: "Balanced Choice" };
  }
};

function calculateTCO(entity) {
  const price = entity.market?.bestOffer?.priceUsd ?? 1000;
  const resale = price * ((entity.specs?.resale ?? 30) / 100);
  const maintenance = 150; // 4-year estimate
  return Math.round(price + maintenance - resale);
}
