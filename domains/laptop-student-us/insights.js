// detectIntentConflicts, attemptRecovery, detectArchetype, buildGrowthArtifacts
import { evaluateCandidate } from "./scoring.js";

export function detectIntentConflicts({ profile, ruleset }) {
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

    // Law of Semantic Drift: Stop if we've relaxed >30%
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
