/**
 * Rainforest API Amazon product price provider.
 * https://rainforestapi.com — GET /request?api_key={key}&type=product&asin={asin}
 */

const DEFAULT_BASE = 'https://api.rainforestapi.com';

export async function fetchFromProvider(asin, { apiKey, baseUrl, entityId }) {
  const base = baseUrl ?? DEFAULT_BASE;
  const url  = `${base}/request?api_key=${encodeURIComponent(apiKey)}&type=product&asin=${asin}&amazon_domain=amazon.com`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Rainforest HTTP ${res.status} for ASIN ${asin}`);

  const data = await res.json();
  const product = data.product ?? {};
  const capturedAt = new Date().toISOString();

  const offers = [];

  if (product.buybox_winner?.price?.value) {
    offers.push({
      entityId,
      priceUsd:    Number(product.buybox_winner.price.value),
      condition:   normalizeCondition(product.buybox_winner.condition?.value),
      productUrl:  product.link ?? `https://www.amazon.com/dp/${asin}`,
      sellerName:  product.buybox_winner.seller_name ?? 'Amazon',
      capturedAt,
      sourcePlatform: 'amazon',
      sellerRating: null,
      sellerReviewCount: null,
    });
  }

  for (const offer of (product.offers ?? [])) {
    if (!offer.price?.value) continue;
    offers.push({
      entityId,
      priceUsd:    Number(offer.price.value),
      condition:   normalizeCondition(offer.condition?.value),
      productUrl:  offer.link ?? `https://www.amazon.com/dp/${asin}`,
      sellerName:  offer.seller_name ?? 'Amazon',
      capturedAt,
      sourcePlatform: 'amazon',
      sellerRating: null,
      sellerReviewCount: null,
    });
  }

  return offers.filter(o => !Number.isNaN(o.priceUsd) && o.priceUsd > 0);
}

function normalizeCondition(raw) {
  const s = (raw ?? 'new').toLowerCase();
  if (s.includes('refurb') || s.includes('renewed')) return 'refurbished';
  if (s.includes('open')) return 'open_box';
  return 'new';
}
