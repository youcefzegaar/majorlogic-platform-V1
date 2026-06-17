/**
 * refreshCatalogPrices — core price refresh logic.
 *
 * Mutates only entity.market fields (offers, bestOffer, priceCapturedAt, priceStale).
 * Never touches entity.specs or entity.identity.
 *
 * @param {object[]} entities          - array of catalog entities (mutated in place)
 * @param {object}   adapter           - PriceSourceAdapter instance
 * @param {object}   [opts]
 * @param {number}   [opts.maxRequests=30]  - cap on API calls
 * @param {number}   [opts.staleDays=14]    - age threshold for priceStale flag
 * @param {string[]} [opts.priorityIds]     - entityIds to refresh first (others skipped until cap)
 * @param {function} [opts.logger]          - logger.log / logger.warn / logger.error
 * @returns {Promise<{refreshed: number, stale: number, failed: number}>}
 */
export async function refreshCatalogPrices(entities, adapter, opts = {}) {
  const {
    maxRequests = 30,
    staleDays   = 14,
    priorityIds = null,
    logger      = console,
  } = opts;

  const staleMs = staleDays * 24 * 60 * 60 * 1000;
  const nowMs   = Date.now();

  // Select which entities to refresh: priorityIds first, then all, capped at maxRequests
  const candidates = priorityIds
    ? entities.filter(e => priorityIds.includes(e.entityId))
    : entities;
  const toRefresh = candidates.slice(0, maxRequests);

  let refreshed = 0;
  let failed    = 0;

  for (const entity of toRefresh) {
    try {
      const offers = await adapter.fetchOffers(entity);
      if (offers.length === 0) continue;

      const capturedAt = new Date().toISOString();
      const normalized = offers.map(o => ({ ...o, capturedAt: o.capturedAt ?? capturedAt }));
      const bestOffer  = normalized.reduce((best, o) =>
        !best || o.priceUsd < best.priceUsd ? o : best, null);

      if (!entity.market) entity.market = {};
      entity.market.offers          = normalized;
      entity.market.bestOffer       = bestOffer;
      entity.market.priceCapturedAt = bestOffer?.capturedAt ?? capturedAt;
      entity.market.priceStale      = false;

      refreshed++;
      logger.log(`[refresh-prices] ✓ ${entity.entityId} → $${bestOffer?.priceUsd}`);
    } catch (err) {
      logger.error(`[refresh-prices] ✗ ${entity.entityId}: ${err.message}`);
      failed++;
    }
  }

  // Mark all remaining entities whose price data is older than staleDays
  const staleSet = new Set(toRefresh.map(e => e.entityId));
  for (const entity of entities) {
    if (staleSet.has(entity.entityId)) continue; // already handled above
    const capturedAt = entity.market?.priceCapturedAt
      ?? entity.market?.bestOffer?.capturedAt
      ?? entity.publishedAt
      ?? null;
    if (capturedAt && nowMs - new Date(capturedAt).getTime() > staleMs) {
      if (!entity.market) entity.market = {};
      entity.market.priceStale = true;
    }
  }

  const stale = entities.filter(e => e.market?.priceStale === true).length;
  return { refreshed, stale, failed };
}
