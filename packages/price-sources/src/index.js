/**
 * Price Sources — provider-agnostic price refresh infrastructure.
 *
 * @typedef {Object} PriceOffer
 * @property {string} entityId
 * @property {number} priceUsd
 * @property {string} condition - 'new' | 'refurbished' | 'open_box'
 * @property {string} productUrl
 * @property {string} sellerName
 * @property {string} capturedAt - ISO 8601 timestamp
 * @property {string} sourcePlatform - 'amazon' | 'ebay'
 * @property {number|null} [sellerRating] - 1-5 composite (null until DATA-2)
 * @property {number|null} [sellerReviewCount]
 */

/**
 * @typedef {Object} PriceSourceAdapter
 * @property {string} name
 * @property {function(entity: object): Promise<PriceOffer[]>} fetchOffers
 */

export class NotYetEligibleError extends Error {
  constructor(reason) {
    super(`Price source not yet eligible: ${reason}`);
    this.name = 'NotYetEligibleError';
  }
}

export async function loadAdapter(name) {
  switch (name) {
    case 'amazon-thirdparty': {
      const { AmazonThirdPartyAdapter } = await import('./adapters/amazon-thirdparty.js');
      return new AmazonThirdPartyAdapter();
    }
    case 'creators-api': {
      const { CreatorsApiAdapter } = await import('./adapters/creators-api.js');
      return new CreatorsApiAdapter();
    }
    default:
      throw new Error(`Unknown price source adapter: ${name}`);
  }
}
