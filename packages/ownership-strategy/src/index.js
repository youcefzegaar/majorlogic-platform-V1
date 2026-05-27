/**
 * ownership-strategy — Layer 4 (Platform): Ownership Strategy
 *
 * الغرض: بعد أن يختار المحرك أفضل الأجهزة، هذه الطبقة تجيب على السؤال:
 *   "ما أفضل طريقة لامتلاك هذا الجهاز؟"
 *
 * تحسب:
 *   - التكلفة الكلية للملكية (TCO) عبر أفق زمني
 *   - توصية الملكية (جديد، مجدد، تمويل)
 *   - تحليل إعادة البيع
 *
 * مبدأ: هذه الطبقة تأتي بعد القرار — لا تغيّر الترتيب أبداً.
 */

// Calibrated on Swappa/eBay 2024 data: Mac retains 40-50% after 4yr (~19%/yr),
// non-Mac retains 22-38% (~27%/yr). resaleScore adjusts within each tier.
function getDepreciationRate(isMac, resaleScore) {
  const base = isMac ? 0.19 : 0.27;
  const adj = ((resaleScore - 75) / 100) * -0.10;
  return Math.max(0.12, Math.min(0.42, base + adj));
}

function classifyUsageIntensity(profile) {
  const perf  = profile?.priorities?.performance ?? 50;
  const major = profile?.major ?? '';
  const MAJOR_BOOST = { cs: 12, engineering: 12, ai: 12, design: 7 };
  const adjusted = perf + (MAJOR_BOOST[major] ?? 0);
  if (adjusted >= 70) return 'heavy';
  if (adjusted >= 42) return 'medium';
  return 'light';
}

const MAINTENANCE_RATES = { light: 0.020, medium: 0.035, heavy: 0.052 };

function computeLifecycleCost({
  purchasePrice,
  resaleScore,
  ownershipYears   = 4,
  laptopCategory   = 'non_mac',
  usageIntensity   = 'medium',
}) {
  const price  = purchasePrice || 0;
  const isMac  = laptopCategory === 'mac';
  const rate   = getDepreciationRate(isMac, resaleScore ?? 55);

  const estimatedResaleValue = Math.round(price * Math.pow(1 - rate, ownershipYears));

  // maintenanceCost is separated from costPerYear to stay consistent with
  // OwnershipPhase which computes renewed/open_box without maintenance.
  const maintenanceCost = Math.round(
    price * (MAINTENANCE_RATES[usageIntensity] ?? 0.035) * ownershipYears
  );

  const netCost     = price - estimatedResaleValue;
  const costPerYear = Math.round(netCost / ownershipYears);

  return {
    purchasePrice:            price,
    ownershipYears,
    laptopCategory,
    usageIntensity,
    estimatedResaleValue,
    maintenanceCost,
    netCost,
    totalCostWithMaintenance: netCost + maintenanceCost,
    costPerYear,
    tco:                      netCost + maintenanceCost,
    annualDepreciationPct:    Math.round(rate * 100),
  };
}

export function buildOwnershipStrategy({ profile, catalog, decision, domainPack }) {
  if (decision.status !== "ok" || !decision.cards.length) {
    return {
      status: "deferred",
      explanation: "No viable recommendation was made, so ownership strategy is deferred.",
      strategies: []
    };
  }

  const ownershipYears = profile.ownershipYears ?? 4;

  const strategies = decision.cards.map((card) => {
    const entity = catalog.getEntity
      ? catalog.getEntity(card.entityId)
      : catalog.all().find((entry) => entry.entityId === card.entityId);

    if (!entity) {
      return {
        cardType: card.cardType,
        entityId: card.entityId,
        status: "unresolved"
      };
    }

    const usageIntensity = classifyUsageIntensity(profile);
    const laptopCategory = entity?.specs?.laptopCategory ?? 'non_mac';
    const priceUsd       = card.priceUsd ?? entity?.market?.bestOffer?.priceUsd ?? 0;
    const resaleScore    = card.resaleScore ?? entity?.economicSignals?.resaleScore ?? 55;

    const lifecycle = computeLifecycleCost({
      purchasePrice: priceUsd,
      resaleScore,
      ownershipYears,
      laptopCategory,
      usageIntensity,
    });

    const domainRecommendation = domainPack.recommendOwnership
      ? domainPack.recommendOwnership({
        profile,
        entity,
        heroCard: card
      })
      : { mode: "buy_new", explanation: "Default ownership path." };

    return {
      cardType: card.cardType,
      entityId: card.entityId,
      title: card.title,
      lifecycle,
      recommendation: domainRecommendation,
      ownershipConfig: domainPack.ownershipConfig ?? null,
      summary: `${card.title}: $${lifecycle.costPerYear}/year effective cost over ${ownershipYears} years. Resale recovery ~$${lifecycle.estimatedResaleValue}.`
    };
  });

  const bestValue = [...strategies]
    .filter((s) => s.lifecycle)
    .sort((a, b) => a.lifecycle.costPerYear - b.lifecycle.costPerYear)[0] ?? null;

  return {
    status: "ok",
    ownershipYears,
    strategies,
    bestValueCard: bestValue?.cardType ?? null,
    bestValueSummary: bestValue?.summary ?? null
  };
}
