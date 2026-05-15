/**
 * Commercial Routing — Ethical Multi-Store Offer Ranking
 *
 * المبادئ الأخلاقية المُطبَّقة هنا:
 *  1. محرك القرار (Decision Engine) لا يعلم بوجود روابط أفيليت — يوصي بالمواصفات فقط.
 *  2. هذه الطبقة تُنشَّط بعد صدور القرار، ولا تؤثر عليه بأي شكل.
 *  3. الترتيب: الأرخص أولاً لمصلحة المستخدم. وإذا تساوت أسعار، نُفضّل الأفيليت.
 *  4. نُظهر كل المتاجر للمستخدم — لا إخفاء، لا تلاعب.
 *  5. نُفصح صراحةً عن وجود عمولة أفيليت في رد الـ API.
 */

const CONDITION_RANK = {
  "new":          1,
  "open_box":     2,
  "refurbished":  3,
  "used":         4
};

/**
 * ترتيب العروض بالمعيار الأخلاقي:
 * الأولوية: السعر الأقل → ثم حالة المنتج الأفضل → ثم وجود رابط أفيليت (كمُرجِّح فقط)
 */
function rankOffersEthically(validOffers) {
  return [...validOffers].sort((a, b) => {
    // 1. الأرخص أولاً (مصلحة المستخدم)
    if (a.priceUsd !== b.priceUsd) return a.priceUsd - b.priceUsd;

    // 2. إذا تساوى السعر: نُفضّل حالة المنتج الأفضل (new > open_box > refurbished)
    const rankA = CONDITION_RANK[a.condition] ?? 9;
    const rankB = CONDITION_RANK[b.condition] ?? 9;
    if (rankA !== rankB) return rankA - rankB;

    // 3. إذا تساوى السعر والحالة: الأفيليت يُرجِّح فقط هنا (وليس في أي خطوة سابقة)
    if (a.affiliate && !b.affiliate) return -1;
    if (!a.affiliate && b.affiliate) return 1;

    return 0;
  });
}

export function attachCommercialRoutes({ decision, catalog, domainPack }) {
  if (decision.status !== "ok") {
    return { status: decision.status, routes: [], affiliateDisclosure: null };
  }

  let hasAnyAffiliate = false;

  const routes = decision.cards.map((card) => {
    const entity = catalog.getEntity(card.entityId);

    if (!entity) {
      return { cardType: card.cardType, entityId: card.entityId, status: "unresolved", offers: [] };
    }

    const allOffers = entity.market?.offers || [];
    const validOffers = allOffers.filter(o => o.priceUsd > 0);

    if (!validOffers.length) {
      return { cardType: card.cardType, entityId: card.entityId, status: "no_route_available", offers: [] };
    }

    // Custom domain routing hook (optional override)
    let rankedOffers;
    if (domainPack?.resolveCommercialRoutes) {
      rankedOffers = domainPack.resolveCommercialRoutes(entity, validOffers);
      if (!Array.isArray(rankedOffers)) rankedOffers = [rankedOffers].filter(Boolean);
    } else {
      rankedOffers = rankOffersEthically(validOffers);
    }

    // Normalize offer shape for API consumers
    const normalizedOffers = rankedOffers.map((offer, idx) => {
      if (offer.affiliate) hasAnyAffiliate = true;

      return {
        rank: idx + 1,
        seller: offer.seller,
        sellerType: offer.sellerType ?? "unknown",
        priceUsd: offer.priceUsd,
        condition: offer.condition,
        commissionRate: offer.commissionRate ?? 0,
        isBestDeal: idx === 0,           // الأرخص دائماً يحمل شارة "Best Deal"
        isAffiliate: offer.affiliate === true,
        // رابط البوابة النظيف (نمرره عبر السيرفر، لا مباشرة)
        // الـ Frontend سيستخدم: /go/:domain/:entityId?seller=Amazon
        buyRoute: `/go/laptop-student-us/${encodeURIComponent(card.entityId)}?seller=${encodeURIComponent(offer.seller)}`
      };
    });

    return {
      cardType: card.cardType,
      entityId: card.entityId,
      status: "routed",
      transparency: {
        isAffiliate: rankedOffers[0]?.affiliate === true,
        isNeutral: rankedOffers[0]?.commissionRate === 0,
        badge: rankedOffers[0]?.commissionRate === 0 ? "💎" : "🤝",
        label: rankedOffers[0]?.commissionRate === 0 ? "Pure Recommendation" : "Verified Partner"
      },
      bestOffer: normalizedOffers[0],     // الأرخص دائماً لمصلحة المستخدم
      allOffers: normalizedOffers          // الشفافية الكاملة
    };
  });

  return {
    status: "ok",
    routes,
    // إفصاح صريح ومدمج في الرد — يُستخدَم في الـ UI
    affiliateDisclosure: hasAnyAffiliate
      ? "Some 'Buy Now' links are affiliate links. We earn a small commission if you purchase — this never influences our recommendations, which are based solely on specs and fit."
      : null
  };
}
