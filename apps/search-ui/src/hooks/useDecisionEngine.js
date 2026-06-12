import { useState } from 'react';
import { runDecision as apiRunDecision } from '../../../../packages/api-client/src/index.js';
import { detectConflicts } from './decision-conflicts.js';
import { buildProfile, toSlider, resolveImage, buildStabilityDescription } from './decision-profile.js';
import { API_URL as apiUrl } from '../lib/apiUrl.js';

// ── Re-exported so callers that import toSlider from this module still work ──
export { toSlider };

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
    integrityScore: 1.0,
    catalogFreshness: null,
  });
  const [decisionRunId, setDecisionRunId_] = useState(null);

  const runDecision = async ({ major, lang, budgetMax, priorities, goal }) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const profile = buildProfile({ major, lang, budgetMax, priorities, goal });
      const localConflicts = detectConflicts(profile, lang);
      const result = await apiRunDecision(profile);
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
            explanation:           card.explanation ?? null,

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
        integrityScore: rawIntegrity <= 1.0 ? Math.round(rawIntegrity * 100) : Math.round(rawIntegrity),
        irHash: result.decision?.governance?.irHash ?? null,
        catalogFreshness: result.catalogFreshness ?? null,
      });
      setDetectedConflicts(localConflicts);
      const runId = result.decision?.decisionRunId ?? null;
      setDecisionRunId_(runId);

      // Return snapshot so callers (e.g. history persistence) can use the values
      // without waiting for the next React render cycle.
      return {
        cards: newCards,
        noResults: result.decision?.status === 'no_viable_option'
          ? { message: result.decision.message || '', suggestions: result.decision.suggestions || [] }
          : null,
        analysisSummary: {
          conflicts: localConflicts.filter(c => c.type !== 'harmony').length,
          devices: result.trust?.trace?.candidateCount ?? 0,
          paths: result.decision?.cards?.length ?? 0,
          confidence: Math.round((result.trust?.decisionConfidenceScore ?? 0.78) * 100),
        },
        detectedConflicts: localConflicts,
        decisionMetadata: {
          relaxedConstraint: result.decision?.relaxedConstraint || null,
          integrityScore: (() => { const r = result.decision?.integrityScore ?? 1.0; return r <= 1.0 ? Math.round(r * 100) : Math.round(r); })(),
          irHash: result.decision?.governance?.irHash ?? null,
          catalogFreshness: result.catalogFreshness ?? null,
        },
        decisionRunId: runId,
      };
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

  const restoreDecision = (snapshot) => {
    setCards(snapshot.cards ?? {});
    setNoResults(snapshot.noResults ?? null);
    setAnalysisSummary(snapshot.analysisSummary ?? { conflicts: 0, devices: 0, paths: 3, confidence: 0 });
    setDetectedConflicts(snapshot.detectedConflicts ?? []);
    setDecisionMetadata(snapshot.decisionMetadata ?? { relaxedConstraint: null, integrityScore: 100, catalogFreshness: null });
    setDecisionRunId_(snapshot.decisionRunId ?? null);
  };

  return {
    isAnalyzing,
    error,
    cards,
    noResults,
    analysisSummary,
    detectedConflicts,
    decisionMetadata,
    decisionRunId,
    runDecision,
    restoreDecision,
  };
}
