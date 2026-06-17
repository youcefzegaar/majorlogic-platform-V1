/**
 * FlyByApis Amazon product price provider.
 * https://flybyapis.com — GET /product/price?asin={asin}
 */

const DEFAULT_BASE = 'https://api.flybyapis.com/v1';

export async function fetchFromProvider(asin, { apiKey, baseUrl, entityId }) {
  const base = baseUrl ?? DEFAULT_BASE;
  const url  = `${base}/product/price?asin=${asin}&country=US`;

  const res = await fetch(url, {
    headers: { 'X-API-Key': apiKey, 'Accept': 'application/json' },
  });

  if (!res.ok) throw new Error(`FlyByApis HTTP ${res.status} for ASIN ${asin}`);

  const data = await res.json();
  const capturedAt = new Date().toISOString();

  return (data.offers ?? [data]).map(offer => ({
    entityId,
    priceUsd:    Number(offer.price ?? offer.priceUsd),
    condition:   normalizeCondition(offer.condition),
    productUrl:  offer.url ?? `https://www.amazon.com/dp/${asin}`,
    sellerName:  offer.sellerName ?? 'Amazon',
    capturedAt,
    sourcePlatform: 'amazon',
    sellerRating: null,
    sellerReviewCount: null,
  })).filter(o => !Number.isNaN(o.priceUsd) && o.priceUsd > 0);
}

function normalizeCondition(raw) {
  const s = (raw ?? 'new').toLowerCase();
  if (s.includes('refurb') || s.includes('renewed')) return 'refurbished';
  if (s.includes('open')) return 'open_box';
  return 'new';
}
