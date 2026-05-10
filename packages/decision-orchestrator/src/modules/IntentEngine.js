/**
 * Intent Engine
 * Extracts and maps user intents into the dynamic cognitive topology.
 */
export class IntentEngine {
  constructor(logger = console) {
    this.logger = logger;
  }

  resolve(config, userProfile) {
    const intentId = userProfile.intentId || config.defaultIntentId || "general";
    const locale = userProfile.locale || config.defaultLocale || "en";
    const intentNode = config.intentGraph?.[intentId] || { id: "general" };

    this.logger.log(`[IntentEngine] Resolving Intent: ${intentId} (${locale})`);

    const localizedTitle = this._getLocalizedValue(intentNode.title, locale, "General Intent");
    const localizedExpert = this._getLocalizedValue(intentNode.expertIdentity, locale, config.expertIdentity || "Expert Advisor");
    const localizedFuture = this._getLocalizedValue(intentNode.futureProjection, locale, null);

    // Deep merge to create Dynamic Topology
    const resolvedConfig = {
      ...config,
      expertIdentity: localizedExpert,
      gates: { ...(config.gates || {}), ...(intentNode.gates || {}) },
      scores: { ...(config.scores || {}), ...(intentNode.scores || {}) }
    };

    const intentContext = {
      id: intentId,
      title: localizedTitle,
      futureProjection: localizedFuture
    };

    return { resolvedConfig, intentContext };
  }

  _getLocalizedValue(field, locale, fallback) {
    if (!field) return fallback;
    if (typeof field === "string") return field;
    return field[locale] || field["en"] || fallback;
  }
}
