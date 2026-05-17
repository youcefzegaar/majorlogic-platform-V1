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

/**
 * يحسب التكلفة الكلية للملكية (Total Cost of Ownership).
 *
 * @param {object} params
 * @param {number} params.purchasePrice  — سعر الشراء
 * @param {number} params.resaleScore    — تصنيف إعادة البيع (0-100)
 * @param {number} [params.ownershipYears] — سنوات الامتلاك المتوقعة
 * @param {number} [params.depreciationFactor] — معامل الهبوط الخاص بالدومين
 * @returns {{ tco, estimatedResaleValue, netCost, costPerYear }}
 */
function computeLifecycleCost({ purchasePrice, resaleScore, ownershipYears = 4, depreciationFactor = 0.65 }) {
  const safePrice = purchasePrice || 0;
  const depreciationRate = 1 - (resaleScore / 100) * depreciationFactor;
  const estimatedResaleValue = Math.round(safePrice * (1 - depreciationRate) * 100) / 100;
  const netCost = safePrice - estimatedResaleValue;
  const costPerYear = Math.round((netCost / ownershipYears) * 100) / 100;

  return {
    purchasePrice: safePrice,
    ownershipYears,
    estimatedResaleValue,
    netCost,
    costPerYear,
    tco: netCost
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

    const lifecycle = computeLifecycleCost({
      purchasePrice: card.priceUsd ?? entity?.market?.bestOffer?.priceUsd ?? 0,
      resaleScore: card.resaleScore ?? entity?.economicSignals?.resaleScore ?? 50,
      ownershipYears,
      depreciationFactor: domainPack.economicConfig?.depreciationFactor ?? 0.65
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
