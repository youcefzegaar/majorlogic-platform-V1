/**
 * Amazon Third-Party Price Adapter
 *
 * Fetches live Amazon prices via a configured third-party provider
 * (FlyByApis or Rainforest API). Provider-specific HTTP shapes are
 * isolated in sub-modules under ./providers/.
 *
 * Required env vars:
 *   PRICE_SOURCE_AMAZON_PROVIDER  — 'flybyapis' | 'rainforest'
 *   PRICE_SOURCE_AMAZON_KEY       — API key for the provider
 *   PRICE_SOURCE_AMAZON_BASE_URL  — Base URL override (optional per provider)
 */

const PROVIDER_MODULES = {
  flybyapis: () => import('./providers/flybyapis.js'),
  rainforest: () => import('./providers/rainforest.js'),
};

export class AmazonThirdPartyAdapter {
  get name() { return 'amazon-thirdparty'; }

  _extractAsin(url) {
    const match = (url ?? '').match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
  }

  async fetchOffers(entity) {
    const provider = process.env.PRICE_SOURCE_AMAZON_PROVIDER;
    const apiKey   = process.env.PRICE_SOURCE_AMAZON_KEY;
    const baseUrl  = process.env.PRICE_SOURCE_AMAZON_BASE_URL;

    if (!provider || !apiKey) {
      throw new Error(
        'Amazon price source not configured (missing PRICE_SOURCE_AMAZON_PROVIDER or PRICE_SOURCE_AMAZON_KEY)'
      );
    }

    const amazonOffers = (entity.market?.offers ?? []).filter(
      o => o.platform === 'amazon' && o.productUrl
    );
    if (amazonOffers.length === 0) return [];

    const asin = this._extractAsin(amazonOffers[0].productUrl);
    if (!asin) return [];

    const loader = PROVIDER_MODULES[provider];
    if (!loader) throw new Error(`Unknown Amazon provider: ${provider}`);

    const { fetchFromProvider } = await loader();
    return fetchFromProvider(asin, { apiKey, baseUrl, entityId: entity.entityId });
  }
}
