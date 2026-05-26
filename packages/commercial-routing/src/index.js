/**
 * Commercial Routing — Ethical Multi-Store Offer Ranking (Layer 2)
 *
 * Ethical principles applied here:
 *  1. The Decision Engine has no knowledge of affiliate links — it recommends specs only.
 *  2. This layer activates after the decision is issued, and never influences it.
 *  3. Ranking: cheapest first for user benefit. Trust and certifications break ties.
 *  4. All stores are shown — no hiding, no manipulation.
 *  5. Affiliate commission is disclosed explicitly in the API response.
 *  6. Offers are filtered by ownership method trust thresholds before ranking.
 */

import {
  filterOffersByOwnershipMethod,
  rankOffersEthically,
} from './vendorTrust.js';

export function attachCommercialRoutes({ decision, catalog, domainPack, ownershipStrategies }) {
  if (decision.status !== "ok") {
    return { status: decision.status, routes: [], affiliateDisclosure: null };
  }

  let hasAnyAffiliate = false;

  const routes = decision.cards.map((card) => {
    const entity = catalog.getEntity(card.entityId);

    if (!entity) {
      return { cardType: card.cardType, entityId: card.entityId, status: "unresolved", offers: [] };
    }

    const allOffers = (entity.market?.offers ?? []).filter(o => o.priceUsd > 0);

    if (!allOffers.length) {
      return { cardType: card.cardType, entityId: card.entityId, status: "no_route_available", offers: [] };
    }

    // Resolve ownership method for this card (from buildOwnershipStrategy output)
    const ownershipStrategy = ownershipStrategies?.find(s => s.cardType === card.cardType);
    const ownershipMode = ownershipStrategy?.recommendation?.mode ?? 'buy_new';
    const thresholds = domainPack?.ownershipConfig?.trustThresholds;

    // Layer 2: filter by ownership method trust thresholds
    const { filtered, applied, effectiveMode } =
      filterOffersByOwnershipMethod(allOffers, ownershipMode, thresholds);

    // Rank: domain hook (receives trust-filtered offers) or default 7-level ethical ranking
    let rankedOffers;
    if (domainPack?.resolveCommercialRoutes) {
      rankedOffers = domainPack.resolveCommercialRoutes(entity, filtered);
      if (!Array.isArray(rankedOffers)) rankedOffers = [rankedOffers].filter(Boolean);
    } else {
      rankedOffers = rankOffersEthically(filtered);
    }

    const normalizedOffers = rankedOffers.map((offer, idx) => {
      if (offer.affiliate) hasAnyAffiliate = true;

      return {
        rank: idx + 1,
        seller: offer.seller,
        sellerType: offer.sellerType ?? "unknown",
        priceUsd: offer.priceUsd,
        condition: offer.condition,
        vendorTrustScore: offer.vendorTrustScore ?? null,
        platform: offer.platform ?? null,
        commissionRate: offer.commissionRate ?? 0,
        isBestDeal: idx === 0,
        isAffiliate: offer.affiliate === true,
        buyRoute: `/go/laptop-student-us/${encodeURIComponent(card.entityId)}?seller=${encodeURIComponent(offer.seller)}`
      };
    });

    return {
      cardType: card.cardType,
      entityId: card.entityId,
      status: "routed",
      filteredByOwnership: applied,
      ownershipMode,
      effectiveOwnershipMode: effectiveMode,
      transparency: {
        isAffiliate: rankedOffers[0]?.affiliate === true,
        isNeutral: rankedOffers[0]?.commissionRate === 0,
        badge: rankedOffers[0]?.commissionRate === 0 ? "💎" : "🤝",
        label: rankedOffers[0]?.commissionRate === 0 ? "Pure Recommendation" : "Verified Partner"
      },
      bestOffer: normalizedOffers[0],
      allOffers: normalizedOffers
    };
  });

  return {
    status: "ok",
    routes,
    affiliateDisclosure: hasAnyAffiliate
      ? "Some 'Buy Now' links are affiliate links. We earn a small commission if you purchase — this never influences our recommendations, which are based solely on specs and fit."
      : null
  };
}
