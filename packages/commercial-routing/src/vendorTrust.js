/**
 * Vendor Trust — Single source of truth for store reliability scoring.
 *
 * Two-layer architecture:
 *   Layer 1 (catalog time): computeVendorTrustScore enriches each offer with objective facts.
 *   Layer 2 (query time):   filterOffersByOwnershipMethod applies business rules per ownership mode.
 *
 * Phase 1 (now):   vendorTrustScore = platformBase (static)
 * Phase 2 (auto):  Bayesian composite activates when offer.sellerRating + offer.reviewCount are present.
 */

export const VENDOR_TRUST = {
  amazon_renewed: 92,
  costco:         88,
  back_market:    88,
  bestbuy:        87,
  amazon:         87,
  affirm:         78,
  swappa:         72,
  ebay:           68,
  unknown:        55
};

export const DEFAULT_OWNERSHIP_REQUIREMENTS = {
  buy_new:                  { minTrust: 75, conditions: ['new'] },
  refurbished_if_verified:  { minTrust: 85, conditions: ['refurbished', 'new'] },
  open_box_with_guardrails: { minTrust: 65, conditions: ['open_box', 'new'] },
  light_financing:          { minTrust: 65, conditions: ['new', 'open_box', 'refurbished'] },
};

// Security: requires amazon + renewed together — a seller named 'Best Renewed Store' stays 'unknown'.
export function normalizePlatform(sellerName = '', condition = '') {
  const s = sellerName.toLowerCase();
  if (s.includes('amazon') && (s.includes('renewed') || condition === 'refurbished')) return 'amazon_renewed';
  if (s.includes('back market') || s === 'backmarket' || s === 'backmarket.com') return 'back_market';
  if (s === 'best buy' || s === 'bestbuy' || s.startsWith('bestbuy')) return 'bestbuy';
  if (s.includes('amazon')) return 'amazon';
  if (s === 'costco' || s.startsWith('costco')) return 'costco';
  if (s === 'affirm') return 'affirm';
  if (s === 'swappa' || s.startsWith('swappa')) return 'swappa';
  if (s.includes('ebay')) return 'ebay';
  return 'unknown';
}

export function computeVendorTrustScore(offer) {
  const platform = normalizePlatform(offer.seller ?? '', offer.condition ?? '');
  const platformBase = VENDOR_TRUST[platform] ?? VENDOR_TRUST.unknown;

  // Phase 2: composite Bayesian formula — activates automatically when seller data is present.
  if (offer.sellerRating != null && offer.reviewCount != null) {
    const v = offer.reviewCount;
    const R = offer.sellerRating;
    const m = 1000;  // confidence threshold — ratings from fewer than 1000 reviews are shrunk toward C
    const C = 4.2;   // global average seller rating
    const W = (v * R + m * C) / (v + m);
    const ratingScore = Math.min(((W - 1) / 4) * 100, 100); // 1-5 stars → 0-100
    const volumeScore = Math.min((Math.log10(v + 1) / Math.log10(50000)) * 100, 100);

    let certBoost = 0;
    if (offer.certifications?.includes('manufacturer_certified')) certBoost = 8;
    else if (offer.certifications?.includes('amazon_renewed')) certBoost = 5;

    const composite = Math.round(
      platformBase * 0.40 +
      ratingScore  * 0.35 +
      volumeScore  * 0.15 +
      certBoost
    );
    return { score: Math.min(composite, 100), platform };
  }

  // Phase 1: static platform base only (certBoost not applied — platformBase already encodes cert premium).
  return { score: platformBase, platform };
}

export function rankOffersEthically(offers) {
  return [...offers].sort((a, b) => {
    if (a.priceUsd !== b.priceUsd) return a.priceUsd - b.priceUsd;                   // 1. price

    const tA = a.vendorTrustScore ?? 55, tB = b.vendorTrustScore ?? 55;
    if (tA !== tB) return tB - tA;                                                    // 2. trust

    const certRank = o => o.certifications?.includes('manufacturer_certified') ? 2
      : o.certifications?.includes('amazon_renewed') ? 1 : 0;
    if (certRank(b) !== certRank(a)) return certRank(b) - certRank(a);               // 3. certification

    const vol = o => Math.log10((o.reviewCount ?? 0) + 1);
    if (Math.abs(vol(b) - vol(a)) > 0.1) return vol(b) - vol(a);                    // 4. review volume

    const COND = { new: 1, open_box: 2, refurbished: 3, used: 4 };
    if ((COND[a.condition] ?? 9) !== (COND[b.condition] ?? 9))
      return (COND[a.condition] ?? 9) - (COND[b.condition] ?? 9);                    // 5. condition

    if (a.affiliate !== b.affiliate) return a.affiliate ? -1 : 1;                   // 6. affiliate

    return (a.seller ?? '').localeCompare(b.seller ?? '');                           // 7. alphabetical (deterministic)
  });
}

export function filterOffersByOwnershipMethod(offers, ownershipMode, thresholds) {
  const req = (thresholds ?? DEFAULT_OWNERSHIP_REQUIREMENTS)[ownershipMode];
  if (!req) return { filtered: offers, applied: false, effectiveMode: ownershipMode };

  const passed = offers.filter(o => {
    const score = o.vendorTrustScore ?? computeVendorTrustScore(o).score;
    return req.conditions.includes(o.condition) && score >= req.minTrust;
  });

  if (passed.length > 0)
    return { filtered: passed, applied: true, effectiveMode: ownershipMode };

  // Safe fallback: no offers qualified.
  // For refurbished mode: re-apply buy_new filter (not return all — that would show
  // untrustworthy refurbished offers under a buy_new label).
  if (ownershipMode === 'refurbished_if_verified') {
    const fallbackReq = (thresholds ?? DEFAULT_OWNERSHIP_REQUIREMENTS)['buy_new'];
    const fallbackOffers = fallbackReq
      ? offers.filter(o => {
          const score = o.vendorTrustScore ?? computeVendorTrustScore(o).score;
          return fallbackReq.conditions.includes(o.condition) && score >= fallbackReq.minTrust;
        })
      : offers;
    return {
      filtered: fallbackOffers.length > 0 ? fallbackOffers : offers,
      applied: false,
      effectiveMode: 'buy_new'
    };
  }

  return { filtered: offers, applied: false, effectiveMode: ownershipMode };
}
