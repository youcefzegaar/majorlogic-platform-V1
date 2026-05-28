import { useState } from 'react';

// Ported from domains/laptop-student-us/insights.js — pure profile logic, no imports needed.
function detectConflicts(profile, lang) {
  const isAr = lang === 'ar';
  const insights = [];
  const { sliders, preferences, major, budgetUsd } = profile;
  if (!sliders || !preferences) return insights;

  const demandingMajors = ["engineering", "design", "ai"];
  if (demandingMajors.includes(major) && budgetUsd < 850) {
    insights.push({
      id: "econ_major_bottleneck", type: "conflict",
      gravity: 0.95, confidence: 0.91, trend: "stable", sample_period: "2024-2026",
      dimensions: ["budget", "major"],
      title: isAr ? "عائق اقتصادي" : "Economic Bottleneck",
      description: isAr
        ? `تخصصك (${major.toUpperCase()}) يتطلب عادةً قدرة معالجة عالية. بميزانية ${budgetUsd}$، الكتالوج محدود بأجهزة الفئة الاقتصادية — وهذا يعني شبه يقين بالتنازل في العمر الافتراضي أو الأداء الذروي.`
        : `Your major (${major.toUpperCase()}) typically requires significant processing power. At $${budgetUsd}, the catalog is constrained to economy-tier devices — almost certain compromise in longevity or peak performance.`
    });
  }
  if (sliders.performance > 75 && sliders.portability > 75) {
    insights.push({
      id: "phys_limit_perf_port", type: "conflict",
      gravity: 0.82, confidence: 0.76, trend: "weakening", sample_period: "2024-2026",
      dimensions: ["performance", "portability"],
      title: isAr ? "تعارض الأداء والمحمولية" : "Performance–Portability Tension",
      description: isAr
        ? "في معظم أجهزة x86 الحالية، الأداء العالي لا يزال مرتبطاً بهيكل أثقل بسبب متطلبات التبريد. تصميمات ARM ووبرات البخار بدأت تتحدى هذا — لكن في السوق السائدة لا تزال مقايضة حقيقية."
        : "In most current x86 laptops, high performance still correlates with heavier chassis due to cooling. ARM-based and vapor-chamber designs are beginning to challenge this — but in the mainstream market it remains a real trade-off."
    });
  }
  if (sliders.performance > 80 && preferences.battery > 70) {
    insights.push({
      id: "power_tax_perf_batt", type: "conflict",
      gravity: 0.78, confidence: 0.84, trend: "stable", sample_period: "2024-2026",
      dimensions: ["performance", "battery"],
      title: isAr ? "تعارض الأداء والبطارية" : "Performance–Battery Trade-off",
      description: isAr
        ? "المكونات عالية الأداء تستهلك طاقة أكبر بكثير. الجمع بين بطارية تدوم يوماً كاملاً وأداء ذروي يتطلب إما بطارية أكبر (تزيد الوزن) أو تحديد سقف للأداء تحت الضغط."
        : "High-performance components draw significantly more power. Combining all-day battery with peak performance typically requires either a larger battery (adding weight) or performance caps under load."
    });
  }
  if (["cs", "ai"].includes(major) && sliders.virtual_machines >= 70 && sliders.performance >= 75) {
    insights.push({
      id: "harmony_cs_setup", type: "harmony",
      gravity: 0.90, confidence: 0.88, trend: "stable", sample_period: "2024-2026",
      dimensions: ["major", "performance"],
      title: isAr ? "توافق استراتيجي" : "Strategic Alignment",
      description: isAr
        ? "مستوى الأداء وتخصيصات الأجهزة الافتراضية لديك يتطابقان بشكل وثيق مع ما تتطلبه أعمال CS/AI فعلياً — ملف مُعاير بدقة مع مخاطر منخفضة للإفراط أو التقصير في المواصفات."
        : "Your performance and VM allocation closely match what CS/AI workloads actually demand — a well-calibrated profile with low risk of over- or under-speccing."
    });
  }
  if (budgetUsd > 1400 && preferences.battery > 60 && sliders.portability > 60 && sliders.performance <= 70) {
    insights.push({
      id: "harmony_premium_ultra", type: "harmony",
      gravity: 0.85, confidence: 0.82, trend: "stable", sample_period: "2024-2026",
      dimensions: ["budget", "portability"],
      title: isAr ? "مسار استثمار ذكي" : "Smart Investment Path",
      description: isAr
        ? "ميزانية مرتفعة موجهة نحو البطارية والمحمولية (بدلاً من الأداء الذروي) تتوافق جيداً مع الأجهزة الخفيفة المتميزة — أجهزة ذات عمر طويل وقيمة إعادة بيع مرتفعة في هذه الفئة السعرية."
        : "High budget focused on battery and portability (rather than peak performance) is well-aligned with premium ultrabooks — devices with strong longevity and high resale retention in this price tier."
    });
  }
  if (["general", "medical"].includes(major) && sliders.performance > 85 && budgetUsd > 1500) {
    insights.push({
      id: "risk_overkill", type: "risk",
      gravity: 0.70, confidence: 0.75, trend: "stable", sample_period: "2024-2026",
      dimensions: ["major", "budget"],
      title: isAr ? "احتمال عدم التوافق في الموارد" : "Potential Resource Mismatch",
      description: isAr
        ? "استناداً لأعمال هذا التخصص المعتادة، هذا المستوى من الأداء يتجاوز الاحتياجات الفعلية الملاحظة. توجيه الميزانية نحو جودة الشاشة أو المحمولية سيوفر قيمة يومية أكبر على الأرجح."
        : "Based on typical workloads for this major, this performance level exceeds observed needs. Budget redirected toward display quality or portability would likely deliver more day-to-day value."
    });
  }
  return insights;
}

const IMAGE_REGISTRY = {
  'thinkpad-p1': '/laptops/thinkpad-p1-gen-6.png',
  'zephyrus-g14': '/laptops/asus-zephyrus-g14.png',
  'macbook-air': '/laptops/macbook-air-15.png',
  'macbook-pro': '/laptops/macbook-pro-14.png',
  'dell-inspiron': '/laptops/dell-inspiron-14.png',
  'acer-nitro': '/laptops/acer-nitro-v-15.png',
  'thinkpad-t14': '/laptops/lenovo-thinkpad-t14.png',
  'lenovo-loq': '/laptops/lenovo-loq-15.png',
  'proart': '/laptops/asus-proart-p16.png',
  'omnibook': '/laptops/hp-omnibook-x.png',
  'swift-go': '/laptops/acer-swift-go-14.png',
  'surface': '/laptops/surface-laptop-7.png',
  'msi-pulse': '/laptops/msi-pulse-16.png',
};

function resolveImage(entityId) {
  const id = entityId.toLowerCase();
  const match = Object.keys(IMAGE_REGISTRY).find(k => id.includes(k));
  return match ? IMAGE_REGISTRY[match] : '/laptops/dell-inspiron-14.png';
}

function buildStabilityDescription(score, relaxed, status, lang) {
  const isAr = lang === 'ar';
  if (status === 'COGNITIVE_COLLAPSE') {
    return isAr 
      ? 'لا يمكن اتخاذ قرار عقلاني في ظل هذه القيود الصارمة.' 
      : 'No rational decision possible within these constraints.';
  }
  if (relaxed) {
    return isAr 
      ? 'تم تخفيف أحد القيود للعثور على نتائج. تم تقليل استقرار القرار.' 
      : 'One constraint was relaxed to find results. Stability reduced.';
  }
  if (score >= 80) {
    return isAr 
      ? 'تمت تلبية جميع القيود الأساسية. ملف التضحيات يتوافق تماماً مع أولوياتك.' 
      : 'All core constraints met. Sacrifice profile aligns with your priorities.';
  }
  if (score >= 60) {
    return isAr 
      ? 'تم رصد تسوية طفيفة. يرجى مراجعة التنازلات والمقايضات بعناية.' 
      : 'Mild compromise detected. Review the trade-offs carefully.';
  }
  return isAr 
    ? 'تم تخفيف قيود هامة. يرجى التفكير في تعديل متطلباتك.' 
    : 'Significant constraints relaxed. Consider adjusting your requirements.';
}


// Converts any value to a valid slider integer [0, 100]. Guards against NaN from
// undefined/missing priority fields — Number(undefined) = NaN which would corrupt the API payload.
export function toSlider(v, fallback = 50) {
  const n = Number(v);
  return isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
}

function buildProfile({ major, lang, budgetMax, priorities, goal }) {
  const perf = toSlider(priorities.performance, 70);
  return {
    major,
    locale: lang,
    budgetUsd: budgetMax,
    preferences: {
      performance: perf,
      portability: toSlider(priorities.portability),
      battery: toSlider(priorities.battery),
      display: major === 'design' ? 85 : 50,
      resale: toSlider(priorities.resale, 50)
    },
    sliders: {
      performance: perf,
      virtual_machines: Math.round(perf * 0.85),
      video_4k: Math.round(perf * 0.70),
      gaming: Math.round(perf * 0.75),
      portability: toSlider(priorities.portability)
    },
    context: {
      acceptsOpenBox: true,
      acceptsRefurbished: true,
      financingAllowed: true
    },
    productIntent: {
      performancePreference: "safe_balanced",
      osPreference: "windows_preferred",
      screenSize: "14_16",
      naturalLanguageIntent: goal || (lang === 'ar'
        ? 'أحتاج لابتوب للبرمجة والاستخدام اليومي.'
        : 'I need a laptop for programming and daily use.')
    }
  };
}

export function useDecisionEngine() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [cards, setCards] = useState({});
  const [noResults, setNoResults] = useState(null);
  const [analysisSummary, setAnalysisSummary] = useState({
    conflicts: 0,
    devices: 0,
    paths: 3,
    confidence: 0
  });
  const [detectedConflicts, setDetectedConflicts] = useState([]);
  const [decisionMetadata, setDecisionMetadata] = useState({
    relaxedConstraint: null,
    integrityScore: 1.0
  });

  const runDecision = async ({ major, lang, budgetMax, priorities, goal }) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const profile = buildProfile({ major, lang, budgetMax, priorities, goal });
      const localConflicts = detectConflicts(profile, lang);
      // Direct Railway call — Vercel proxy is unreliable for POST requests
      const apiUrl = import.meta.env.VITE_API_URL || 'https://majorlogicapi-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/v1/laptop-student-us/decision/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      if (!response.ok) throw new Error('API Error');
      const result = await response.json();
      if (result.error) throw new Error(result.message);

      const newCards = {};
      const typeDetails = {
        hero: { 
          badge: lang === 'ar' ? 'خيارنا الأفضل' : 'Hero Pick', 
          badgeClass: 'badge-balance', 
          icon: '💻', 
          scoreLabel: lang === 'ar' ? 'أعلى توافق' : 'High Match' 
        },
        future_proof: { 
          badge: lang === 'ar' ? 'للمستقبل' : 'Future Proof', 
          badgeClass: 'badge-performance', 
          icon: '🚀', 
          scoreLabel: lang === 'ar' ? 'عمر استثنائي طويل' : 'Exceptional Longevity' 
        },
        smart_budget: { 
          badge: lang === 'ar' ? 'الميزانية الذكية' : 'Smart Budget', 
          badgeClass: 'badge-value', 
          icon: '💎', 
          scoreLabel: lang === 'ar' ? 'قيمة ممتازة' : 'Excellent Value' 
        },
        renewed_value: { 
          badge: lang === 'ar' ? 'فرصة مجددة' : 'Renewed Opportunity', 
          badgeClass: 'badge-renewed', 
          icon: '♻️', 
          scoreLabel: lang === 'ar' ? 'أداء ممتاز' : 'Premium Performance' 
        },
      };

      const isValidText = (s) => typeof s === 'string' && s.trim() !== '' && s !== 'null' && s !== 'undefined';

      if (result.decision?.cards) {
        // Build exclusions list with UI-compatible keys (name, reason)
        const excludedList = (result.decision?.topExcludedStories || []).map(item => ({
          name: item.title || item.name,
          reason: item.reason
        }));

        result.decision.cards.forEach(card => {
          const type = card.cardType || 'hero';
          const details = typeDetails[type] || typeDetails.hero;

          // stabilityScore: use API value if available, fall back to decisionConfidenceScore
          const rawStability = result.decision.stabilityScore ?? result.trust?.decisionConfidenceScore;
          const stabilityScore = rawStability != null ? Math.round(rawStability * 100) : null;
          const stabilityStatus = stabilityScore == null ? 'unknown'
            : stabilityScore >= 80 ? 'high'
            : stabilityScore >= 60 ? 'medium' : 'low';

          // score: round to integer so it fits in the score circle (52px)
          const rawScore = card.score != null ? Math.round(card.score)
            : card.confidenceScore != null ? Math.round(card.confidenceScore * 100)
            : 85;

          // purchaseLinks: use real buyRoute from commercialRoutes
          const commercialRoute = result.commercialRoutes?.routes?.find(r => r.cardType === type);
          const allOffers = commercialRoute?.allOffers || [];
          const bestOffer = allOffers.find(o => !o.isAffiliate) || allOffers[0];
          const affiliateOffer = allOffers.find(o => o.isAffiliate);
          const makeBuyUrl = (route) => route?.buyRoute ? `${apiUrl}${route.buyRoute}` : null;

          // Attach ownership strategy for this card type (lifecycle cost + acquisition recommendation)
          const ownershipStrategy = result.ownership?.strategies?.find(s => s.cardType === type) ?? null;

          // Renewed opportunity cards carry their own purchase URL
          const isRenewed = type === 'renewed_value';
          const renewedPurchaseUrl = isRenewed && card.renewedUrl ? card.renewedUrl : null;

          // Affiliate transparency from commercialRoutes
          const transparency = commercialRoute?.transparency ?? null;
          const isAffiliate = transparency?.isAffiliate ?? true;
          // Amazon search fallback when no direct offer URL is available
          const amazonFallback = `https://www.amazon.com/s?k=${encodeURIComponent(card.title || '')}&tag=majorlogic-20`;

          // Gained/Lost dynamically evaluated from rule scores and intelligence payload
          const gained = [];
          const scores = card.trace?.scores || {};
          if (scores.portability_score >= 80) {
            gained.push(lang === 'ar' ? 'أداء استثنائي في التنقل والوزن الخفيف' : 'Superb portability and lightweight mobility');
          }
          if (scores.value_score >= 80) {
            gained.push(lang === 'ar' ? 'قيمة اقتصادية ممتازة مقابل المواصفات والأداء' : 'Outstanding price-to-performance value');
          }
          if (scores.userPreferenceScore >= 60) {
            gained.push(lang === 'ar' ? 'توافق قوي جداً مع تفضيلات الأداء والبطارية التي حددتها' : 'Strong alignment with your specified performance and battery preferences');
          }
          if (gained.length === 0) {
            gained.push(lang === 'ar' ? 'توازن ممتاز للأداء والموثوقية لتخصصك الجامعي' : 'Excellent performance and reliability balance for your major');
          }

          const lost = [];

          // 1. Gemini AI tradeoff — most specific and human (highest priority)
          if (isValidText(card.tradeoff)) lost.push(card.tradeoff);

          // 2. Review intelligence warnings
          const primaryWarn = lang === 'ar' ? (card.intelligence?.primaryWarningAr || card.intelligence?.primaryWarning) : card.intelligence?.primaryWarning;
          const secondaryWarn = lang === 'ar' ? (card.intelligence?.secondaryWarningAr || card.intelligence?.secondaryWarning) : card.intelligence?.secondaryWarning;
          if (isValidText(primaryWarn) && primaryWarn !== card.tradeoff) lost.push(primaryWarn);
          if (isValidText(secondaryWarn) && secondaryWarn !== card.tradeoff) lost.push(secondaryWarn);

          // 3. Kernel sacrifice vector
          const sacrifices = card.sacrifices || card.trace?.sacrifices || {};
          Object.keys(sacrifices).forEach(gate => {
            const info = sacrifices[gate];
            const meaning = info?.meaning;
            if (meaning) {
              lost.push(meaning);
            } else {
              const formattedGate = gate.replace(/_/g, ' ');
              lost.push(lang === 'ar' ? `التضحية بـ ${formattedGate}` : `Sacrificed ${formattedGate}`);
            }
          });

          // 4. Final fallback
          if (lost.length === 0) {
            if (isValidText(card.badNews)) {
              lost.push(card.badNews);
            } else {
              lost.push(lang === 'ar' ? 'تعديلات طفيفة لتلائم ميزانيتك' : 'Minor compromises based on budget limits');
            }
          }

          newCards[type] = {
            entityId: card.entityId,
            name: card.title,
            locale: lang,
            price: `$${(card.priceUsd || budgetMax).toLocaleString()}`,
            originalPrice: isRenewed && card.originalPriceUsd ? `$${card.originalPriceUsd.toLocaleString()}` : null,
            renewedEntry: card.renewedEntry || false,
            renewedSavings: card.renewedSavings || 0,
            heroScoreGap: card.heroScoreGap || 0,
            badge: details.badge,
            badgeClass: details.badgeClass,
            score: rawScore,
            scoreClass: rawScore >= 80 ? 'high' : 'medium',
            scoreLabel: details.scoreLabel,
            icon: details.icon,
            image: resolveImage(card.entityId),
            whyChosen: isValidText(card.story)
              ? card.story
              : (lang === 'ar' 
                  ? 'يوازن هذا الجهاز تماماً بين أولوياتك بناءً على تحليلنا الدقيق.' 
                  : 'This device perfectly balances your priorities based on our analysis.'),
            aiTradeoff: isValidText(card.tradeoff) ? card.tradeoff : null,
            flaws: (() => {
              const collected = [];
              if (isValidText(card.badNews)) collected.push(card.badNews);
              const pWarn = lang === 'ar'
                ? (card.intelligence?.primaryWarningAr || card.intelligence?.primaryWarning)
                : card.intelligence?.primaryWarning;
              const sWarn = lang === 'ar'
                ? (card.intelligence?.secondaryWarningAr || card.intelligence?.secondaryWarning)
                : card.intelligence?.secondaryWarning;
              if (isValidText(pWarn) && !collected.includes(pWarn)) collected.push(pWarn);
              if (isValidText(sWarn) && !collected.includes(sWarn)) collected.push(sWarn);
              return collected.length > 0 ? collected : [
                lang === 'ar'
                  ? 'تنازلات طفيفة بناءً على قيود الميزانية.'
                  : 'Minor compromises based on budget constraints.'
              ];
            })(),
            tradeOffs: {
              gained,
              lost
            },
            sacrificeVector: card.sacrifices || {},
            excluded: excludedList,
            stability: {
              score: stabilityScore ?? 0,
              status: stabilityStatus,
              label: stabilityScore == null 
                ? (lang === 'ar' ? 'غير متوفر' : 'Unavailable') 
                : stabilityScore >= 80 
                  ? (lang === 'ar' ? 'مستقر' : 'Stable') 
                  : (lang === 'ar' ? 'بحاجة لمراجعة' : 'Needs Review'),
              description: buildStabilityDescription(
                stabilityScore,
                !!result.decision.relaxedConstraint,
                result.decision.status,
                lang
              )
            },
            priorities: card.specs || {
              performance: priorities.performance,
              battery: priorities.battery,
              portability: priorities.portability,
              build: 90
            },
            purchaseLinks: {
              primary: renewedPurchaseUrl || makeBuyUrl(bestOffer) || amazonFallback,
              affiliate: renewedPurchaseUrl || makeBuyUrl(affiliateOffer) || amazonFallback,
              primarySeller: isRenewed ? 'Amazon Renewed' : (bestOffer?.seller || 'Amazon'),
              affiliateSeller: isRenewed ? 'Amazon Renewed' : (affiliateOffer?.seller || 'Amazon'),
              priceUsd: isRenewed ? (card.originalPriceUsd || card.priceUsd) : card.priceUsd,
              renewedPriceUsd: isRenewed ? card.priceUsd : null,
              isAffiliate,
              affiliateLabel: transparency?.label ?? 'Verified Partner',
            },
            ownershipStrategy,
            ownershipMode: isRenewed
              ? 'refurbished_if_verified'
              : (commercialRoute?.ownershipMode ?? ownershipStrategy?.recommendation?.mode ?? null),
            effectiveOwnershipMode: isRenewed
              ? 'refurbished_if_verified'
              : (commercialRoute?.effectiveOwnershipMode ?? ownershipStrategy?.recommendation?.mode ?? null),
            filteredByOwnership: isRenewed ? true : (commercialRoute?.filteredByOwnership ?? null),
            offerTrustData: isRenewed
              ? [{ seller: 'Amazon Renewed', vendorTrustScore: 92, platform: 'amazon_renewed' }]
              : (commercialRoute?.allOffers ?? []).map(o => ({
                  seller: o.seller,
                  vendorTrustScore: o.vendorTrustScore ?? null,
                  platform: o.platform ?? null,
                })),

            // ─── Decision Intelligence Layer (all missing data now flows through) ─────
            naturalLanguageIntent: profile.productIntent.naturalLanguageIntent,
            intelligence:          card.intelligence      ?? null,
            topPros:               card.topPros           ?? [],
            userSignals: (() => {
              const real = card.intelligence?.userSignals ?? card.userSignals ?? [];
              if (real.length > 0) return real;
              return (card.topPros ?? []).slice(0, 3);
            })(),
            userSignalsSource: (card.intelligence?.userSignals ?? card.userSignals ?? []).length > 0
              ? 'verified'
              : 'engine',
            decision_confidence:   card.decision_confidence ?? result.decision?.confidence?.score ?? result.trust?.decisionConfidenceScore ?? null,
            tcoEstimate:           card.tcoEstimate ?? ownershipStrategy?.tco ?? null,
            fitStates:             card.fitStates ?? result.decision?.fitStates ?? null,
            traceScores:           card.trace?.scores ?? {},

            // ─── Response-level governance (identical for all cards in this decision) ─
            integrityScore: (() => {
              const raw = result.decision?.integrityScore ?? 1.0;
              return raw <= 1.0 ? Math.round(raw * 100) : Math.round(raw);
            })(),
            conflictsFound:     localConflicts,
            irHash:             result.decision?.governance?.irHash ?? null,
            decisionRunId:      result.decision?.decisionRunId ?? null,
            candidateCount:     result.trust?.trace?.candidateCount ?? 0,
            topExcludedStories: result.decision?.topExcludedStories ?? [],
            relaxedConstraint:  result.decision?.relaxedConstraint ?? null,
          };
        });
      }

      if (result.decision?.status === 'no_viable_option') {
        setNoResults({
          message: result.decision.message || 'No suitable device found for your specific constraints.',
          suggestions: result.decision.suggestions || []
        });
        setCards({});
      } else {
        setNoResults(null);
        // Only show cards the engine actually returned — no synthetic fallbacks.
        // Showing fake data violates the transparency principle.
        setCards(newCards);
      }

      setAnalysisSummary({
        conflicts: localConflicts.filter(c => c.type !== 'harmony').length,
        devices: result.trust?.trace?.candidateCount ?? 0,
        paths: result.decision?.cards?.length ?? 0,
        confidence: Math.round((result.trust?.decisionConfidenceScore ?? 0.78) * 100)
      });
      const rawIntegrity = result.decision?.integrityScore ?? 1.0;
      setDecisionMetadata({
        relaxedConstraint: result.decision?.relaxedConstraint || null,
        integrityScore: rawIntegrity <= 1.0 ? Math.round(rawIntegrity * 100) : Math.round(rawIntegrity)
      });
      setDetectedConflicts(localConflicts);

      return true;
    } catch (err) {
      const isNetworkError = err instanceof TypeError;
      const isAr = lang === 'ar';
      setError(isNetworkError
        ? (isAr ? 'تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.' : 'Could not connect to the server. Check your internet connection.')
        : (err?.message || (isAr ? 'تعذّر إتمام التحليل. يرجى المحاولة مجدداً.' : 'The analysis could not be completed. Please try again.')));
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    isAnalyzing,
    error,
    cards,
    noResults,
    analysisSummary,
    detectedConflicts,
    decisionMetadata,
    runDecision
  };
}
