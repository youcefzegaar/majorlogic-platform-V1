import { useState } from 'react';

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


function buildProfile({ major, lang, budgetMax, priorities, goal }) {
  const perf = Number(priorities.performance);
  return {
    major,
    locale: lang,
    budgetUsd: budgetMax,
    preferences: {
      performance: perf,
      portability: Number(priorities.portability),
      battery: Number(priorities.battery),
      display: major === 'design' ? 85 : 50,
      resale: priorities.resale ?? 50
    },
    sliders: {
      performance: perf,
      virtual_machines: Math.round(perf * 0.85),
      video_4k: Math.round(perf * 0.70),
      gaming: Math.round(perf * 0.75),
      portability: Number(priorities.portability)
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
      naturalLanguageIntent: goal || "I need a laptop for programming and daily use."
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
          const primaryWarn = lang === 'ar' ? (card.intelligence?.primaryWarningAr || card.intelligence?.primaryWarning) : card.intelligence?.primaryWarning;
          const secondaryWarn = lang === 'ar' ? (card.intelligence?.secondaryWarningAr || card.intelligence?.secondaryWarning) : card.intelligence?.secondaryWarning;

          if (isValidText(primaryWarn)) lost.push(primaryWarn);
          if (isValidText(secondaryWarn)) lost.push(secondaryWarn);

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
            whyChosen: isValidText(card.whyThis)
              ? card.whyThis
              : (lang === 'ar' 
                  ? 'يوازن هذا الجهاز تماماً بين أولوياتك بناءً على تحليلنا الدقيق.' 
                  : 'This device perfectly balances your priorities based on our analysis.'),
            flaws: isValidText(card.badNews)
              ? [card.badNews]
              : [(lang === 'ar' 
                  ? 'تنازلات طفيفة بناءً على قيود الميزانية.' 
                  : 'Minor compromises based on budget constraints.')],
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
            ownershipStrategy
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
        conflicts: result.decision?.conflicts?.length ?? 0,
        devices: result.trust?.trace?.candidateCount ?? 0,
        paths: result.decision?.cards?.length ?? 0,
        confidence: Math.round((result.trust?.decisionConfidenceScore ?? 0.78) * 100)
      });
      setDecisionMetadata({
        relaxedConstraint: result.decision?.relaxedConstraint || null,
        integrityScore: result.decision?.integrityScore || 1.0
      });
      setDetectedConflicts(result.decision.conflicts || []);

      return true;
    } catch (err) {
      console.error(err);
      setError('Could not connect to the Decision Engine.');
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
