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

function fallbackCard(type) {
  return {
    name: `Standard ${type} Laptop`,
    price: '$1,000',
    originalPrice: null,
    score: 80,
    scoreClass: 'medium',
    scoreLabel: 'Good Match',
    whyChosen: 'Meets minimum specs.',
    flaws: ['Generic fallback data'],
    tradeOffs: { gained: ['Available'], lost: ['Generic'] },
    excluded: [],
    stability: { score: 70, status: 'medium', label: 'Average', description: 'Fallback logic used.' },
    priorities: { performance: 80, battery: 80, portability: 80, price: 80 },
    purchaseLinks: { amazon: '$1,000', bestbuy: '$1,000', direct: '$1,050' }
  };
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
      acceptsOpenBox: false,
      acceptsRefurbished: false,
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

  const runDecision = async ({ major, lang, budgetMax, budgetMin, priorities, goal }) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const profile = buildProfile({ major, lang, budgetMax, priorities, goal });
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3010';
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
        smart_budget: { badge: 'Smart Budget', badgeClass: 'badge-value', icon: '💎', scoreLabel: 'Excellent Value' }
      };

      if (result.decision?.cards) {
        result.decision.cards.forEach(card => {
          const type = card.cardType || 'hero';
          const details = typeDetails[type] || typeDetails.hero;

          const stabilityScore = result.decision.stabilityScore !== undefined
            ? Math.round(result.decision.stabilityScore * 100)
            : null;

          const stabilityStatus = stabilityScore >= 80
            ? 'high'
            : (stabilityScore >= 60 || stabilityScore === null) ? 'medium' : 'low';

          newCards[type] = {
            name: card.title,
            price: `$${(card.priceUsd || budgetMax).toLocaleString()}`,
            originalPrice: (card.priceUsd && card.priceUsd < budgetMax) ? `$${budgetMax.toLocaleString()}` : null,
            badge: details.badge,
            badgeClass: details.badgeClass,
            score: Math.round(card.score || card.confidenceScore * 100 || 85),
            scoreClass: (card.score || card.confidenceScore * 100 || 85) >= 80 ? 'high' : 'medium',
            scoreLabel: details.scoreLabel,
            icon: details.icon,
            image: resolveImage(card.entityId),
            whyChosen: typeof card.whyThis === 'string' && card.whyThis.trim() !== ''
              ? card.whyThis
              : 'This device perfectly balances your priorities based on our analysis.',
            flaws: typeof card.badNews === 'string' && card.badNews.trim() !== ''
              ? [card.badNews]
              : ['Minor compromises based on budget constraints.'],
            tradeOffs: {
              gained: Array.isArray(card.topPros) && card.topPros.length > 0
                ? card.topPros
                : ['Performance above average'],
              lost: typeof card.secondaryBadNews === 'string' && card.secondaryBadNews.trim() !== ''
                ? [card.secondaryBadNews]
                : ['Slightly heavier than average']
            },
            excluded: card.excluded && card.excluded.length > 0
              ? card.excluded
              : [{ name: 'Generic High-End Option', reason: 'Exceeds budget constraints' }],
            stability: {
              score: stabilityScore || 0,
              status: stabilityStatus,
              label: stabilityScore >= 80 ? 'Stable' : 'Needs Review',
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
              amazon: `$${(card.priceUsd || budgetMax).toLocaleString()}`,
              bestbuy: `$${(card.priceUsd || budgetMax).toLocaleString()}`,
              direct: `$${((card.priceUsd || budgetMax) + 50).toLocaleString()}`
            }
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
        if (!newCards.hero) newCards.hero = { ...fallbackCard('Hero'), badge: 'Hero Pick', badgeClass: 'badge-balance', icon: '💻' };
        if (!newCards.future_proof) newCards.future_proof = { ...fallbackCard('Future Proof'), badge: 'Future Proof', badgeClass: 'badge-performance', icon: '🚀' };
        if (!newCards.smart_budget) newCards.smart_budget = { ...fallbackCard('Smart Budget'), badge: 'Smart Budget', badgeClass: 'badge-value', icon: '💎' };
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
