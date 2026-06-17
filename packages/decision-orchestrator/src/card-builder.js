/**
 * Card Builder — pure functions for enriching kernel results into UI-ready card objects.
 * Extracted from DecisionOrchestrator to isolate narrative composition and template logic.
 */

/**
 * Interpolates {path.to.value} placeholders in a template string using a context object.
 * Returns the original match token if the path is not found.
 */
export function interpolate(template, context) {
  return template.replace(/\{([^}]+)\}/g, (match, path) => {
    const parts = path.split(".");
    let value = context;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return match;
    }
    return String(value);
  });
}

/**
 * Builds one enriched card from a kernel result, raw entity data, and narrative output.
 *
 * @param {string} cardType - hero | smart_budget | future_proof | renewed_value
 * @param {object} kernelResult - { entityId, score, eligible, trace }
 * @param {object} rawEntity - full entity payload from the catalog
 * @param {object} template - output template from decision-config.json
 * @param {object} intelligence - review intelligence signals
 * @param {object} userProfile - user input profile
 * @param {object} domainContext - locale, atlas, intent, cacheKeys, etc.
 * @param {{ explainer, narrativeCache, logger }} deps
 */
export async function buildCard(cardType, kernelResult, rawEntity, template, intelligence, userProfile, domainContext, { explainer, narrativeCache, logger }) {
  const card = {
    cardType,
    entityId: kernelResult.entityId,
    score: Math.round(kernelResult.score * 100) / 100,
    eligible: kernelResult.eligible,
    intelligence,
    trace: kernelResult.trace,
    sacrifices: kernelResult.trace.sacrifices || {},
  };

  // Narrative cache: skip AI call on repeated (irHash, inputHash, entityId) combos
  const { irHash, inputHash } = domainContext._cacheKeys || {};
  const entityId = kernelResult.entityId;
  let narrativeResult = narrativeCache.get(irHash, inputHash, entityId);
  if (narrativeResult !== null) {
    const cacheStats = narrativeCache.stats();
    logger.log(
      `[NarrativeCache] HIT irHash:${irHash?.slice(0, 8)}… entity:${entityId} ratio:${cacheStats.hitRate}`
    );
  } else {
    const narrativeContext = {
      ...domainContext,
      reviewIntelligence: intelligence,
      entitySpecs: {
        price:       rawEntity.market?.bestOffer?.priceUsd ?? null,
        ramGb:       rawEntity.specs?.ramGb               ?? null,
        storageGb:   rawEntity.specs?.storageGb            ?? null,
        performance: rawEntity.specs?.performance          ?? null,
        battery:     rawEntity.specs?.battery              ?? null,
        portability: rawEntity.specs?.portability          ?? null,
        display:     rawEntity.specs?.display              ?? null,
        thermals:    rawEntity.specs?.thermals             ?? null,
        brand:       rawEntity.brand                       ?? null,
      },
      cardType,
      userBudget:            userProfile?.budgetUsd                              ?? null,
      userPreferences:       userProfile?.preferences                            ?? null,
      naturalLanguageIntent: userProfile?.productIntent?.naturalLanguageIntent   ?? null,
    };
    narrativeResult = await explainer.explain(
      kernelResult.trace,
      rawEntity.title || rawEntity.itemName || entityId,
      narrativeContext
    );
    narrativeCache.set(irHash, inputHash, entityId, narrativeResult);
  }

  const story     = narrativeResult?.story    ?? narrativeResult ?? '';
  const aiTradeoff = narrativeResult?.tradeoff ?? null;
  const aiBadNews  = narrativeResult?.badNews  ?? null;

  const tradeoff = aiTradeoff
    || explainer.explainTradeoff(kernelResult.trace, domainContext.atlas, domainContext.locale)
    || intelligence.primaryWarning;

  const context = {
    entity: rawEntity,
    score: kernelResult.score,
    scores: kernelResult.trace.scores,
    entityId: kernelResult.entityId,
    intel: intelligence,
    story,
    tradeoff,
    sacrificeCount: Object.keys(card.sacrifices).length,
    segment: domainContext.intent?.id || "general",
  };

  for (const [key, pattern] of Object.entries(template)) {
    if (typeof pattern === "string") {
      card[key] = interpolate(pattern, context);
    }
  }

  card.title   = card.title || rawEntity.title || rawEntity.itemName || kernelResult.entityId;
  card.story   = story;
  card.tradeoff = card.tradeoff || tradeoff;
  if (aiBadNews) card.badNews = aiBadNews;
  card.priceCapturedAt = rawEntity.market?.bestOffer?.capturedAt ?? rawEntity.publishedAt ?? null;

  if (rawEntity.fitStates && rawEntity.fitStates[context.segment]) {
    card.fitState = rawEntity.fitStates[context.segment].state;
  }

  return card;
}
