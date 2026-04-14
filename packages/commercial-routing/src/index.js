export function attachCommercialRoutes({ decision, catalog, domainPack }) {
  if (decision.status !== "ok") {
    return { status: decision.status, routes: [] };
  }

  const routes = decision.cards.map((card) => {
    const entity = catalog.getEntity(card.entityId);
    
    if (!entity) {
      return { cardType: card.cardType, status: "unresolved" };
    }

    const offers = entity.market?.offers || [];
    const validOffers = offers.filter(o => o.priceUsd > 0);
    
    // Sort offers by price ascending. If prices tie, prefer affiliate (true comes first?)
    // Actually prioritize affiliate offer if price difference is 0 or very small
    // But since this is just the routing layer, we let the domainPack optionally provide routing logic
    // or we resolve it generically:
    
    let selectedRoute = null;
    
    if (domainPack?.resolveCommercialRoutes) {
      selectedRoute = domainPack.resolveCommercialRoutes(entity, validOffers);
    } else {
      // Default Generic Routing Strategy: Target the cheapest affiliate link. Fallback to non-affiliate.
      // 1. Find cheapest offer
      const cheapestPrice = Math.min(...validOffers.map(o => o.priceUsd));
      
      // 2. See if there is an affiliate link matching the exact cheapest price
      const bestAffiliateOffer = validOffers.find(o => o.priceUsd === cheapestPrice && o.affiliate === true);
      
      // 3. Fallback
      selectedRoute = bestAffiliateOffer || validOffers.find(o => o.priceUsd === cheapestPrice) || null;
    }

    return {
      cardType: card.cardType,
      entityId: card.entityId,
      resolvedRoute: selectedRoute ? {
        seller: selectedRoute.seller,
        priceUsd: selectedRoute.priceUsd,
        condition: selectedRoute.condition,
        isAffiliateLink: selectedRoute.affiliate === true
      } : null,
      status: selectedRoute ? "routed" : "no_route_available"
    };
  });

  return {
    status: "ok",
    routes
  };
}
