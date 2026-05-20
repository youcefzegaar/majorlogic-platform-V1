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

function buildStabilityDescription(score, relaxed, status) {
  if (status === 'COGNITIVE_COLLAPSE')
    return 'No rational decision possible within these constraints.';
  if (relaxed)
    return 'One constraint was relaxed to find results. Stability reduced.';
  if (score >= 80)
    return 'All core constraints met. Sacrifice profile aligns with your priorities.';
  if (score >= 60)
    return 'Mild compromise detected. Review the trade-offs carefully.';
  return 'Significant constraints relaxed. Consider adjusting your requirements.';
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
        hero: { badge: 'Hero Pick', badgeClass: 'badge-balance', icon: '💻', scoreLabel: 'High Match' },
        future_proof: { badge: 'Future Proof', badgeClass: 'badge-performance', icon: '🚀', scoreLabel: 'Exceptional Longevity' },
        smart_budget: { badge: 'Smart Budget', badgeClass: 'badge-value', icon: '💎', scoreLabel: 'Excellent Value' },
        renewed_value: { badge: 'Renewed Opportunity', badgeClass: 'badge-renewed', icon: '♻️', scoreLabel: 'Premium Performance' },
      };

      const isValidText = (s) => typeof s === 'string' && s.trim() !== '' && s !== 'null' && s !== 'undefined';

      if (result.decision?.cards) {
        result.decision.cards.forEach(card => {
          const type = card.cardType || 'hero';
          const details = typeDetails[type] || typeDetails.hero;

          // stabilityScore: null means unavailable, not zero
          const rawStability = result.decision.stabilityScore;
          const stabilityScore = rawStability != null ? Math.round(rawStability * 100) : null;
          const stabilityStatus = stabilityScore == null ? 'unknown'
            : stabilityScore >= 80 ? 'high'
            : stabilityScore >= 60 ? 'medium' : 'low';

          // score: guard against NaN from undefined arithmetic
          const rawScore = card.score != null ? card.score
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

          newCards[type] = {
            entityId: card.entityId,
            name: card.title,
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
              : 'This device perfectly balances your priorities based on our analysis.',
            flaws: isValidText(card.badNews)
              ? [card.badNews]
              : ['Minor compromises based on budget constraints.'],
            tradeOffs: {
              gained: Array.isArray(card.topPros) && card.topPros.length > 0
                ? card.topPros
                : ['Performance above average'],
              lost: isValidText(card.secondaryBadNews)
                ? [card.secondaryBadNews]
                : ['Slightly heavier than average']
            },
            sacrificeVector: card.sacrifices || {},
            excluded: Array.isArray(card.excluded) ? card.excluded : [],
            stability: {
              score: stabilityScore ?? 0,
              status: stabilityStatus,
              label: stabilityScore == null ? 'Unavailable' : stabilityScore >= 80 ? 'Stable' : 'Needs Review',
              description: buildStabilityDescription(
                stabilityScore,
                !!result.decision.relaxedConstraint,
                result.decision.status
              )
            },
            priorities: card.specs || {
              performance: priorities.performance,
              battery: priorities.battery,
              portability: priorities.portability,
              build: 90
            },
            purchaseLinks: {
              primary: renewedPurchaseUrl || makeBuyUrl(bestOffer),
              affiliate: renewedPurchaseUrl || makeBuyUrl(affiliateOffer),
              primarySeller: isRenewed ? 'Amazon Renewed' : (bestOffer?.seller || null),
              affiliateSeller: isRenewed ? 'Amazon Renewed' : (affiliateOffer?.seller || null),
              // For renewed_value cards, pass the ORIGINAL new price as the baseline
              // so OwnershipPhase calculates discounts correctly from retail price.
              priceUsd: isRenewed ? (card.originalPriceUsd || card.priceUsd) : card.priceUsd,
              renewedPriceUsd: isRenewed ? card.priceUsd : null,
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
