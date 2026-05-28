import { describe, it, expect } from 'vitest';
import {
  VENDOR_TRUST,
  normalizePlatform,
  computeVendorTrustScore,
  filterOffersByOwnershipMethod,
  rankOffersEthically,
} from '../../packages/commercial-routing/src/vendorTrust.js';

// ─── normalizePlatform ────────────────────────────────────────────────────────

describe('normalizePlatform', () => {
  it('maps "Amazon Renewed" → amazon_renewed', () => {
    expect(normalizePlatform('Amazon Renewed')).toBe('amazon_renewed');
  });

  it('maps amazon seller + refurbished condition → amazon_renewed', () => {
    expect(normalizePlatform('amazon', 'refurbished')).toBe('amazon_renewed');
  });

  it('maps "amazon.com" (no renewed, new) → amazon', () => {
    expect(normalizePlatform('amazon.com', 'new')).toBe('amazon');
  });

  it('security: "Best Renewed Store" does NOT become amazon_renewed', () => {
    expect(normalizePlatform('Best Renewed Store')).toBe('unknown');
  });

  it('security: "renewed store" without amazon does NOT become amazon_renewed', () => {
    expect(normalizePlatform('renewed store', 'refurbished')).toBe('unknown');
  });

  it('maps "eBay" → ebay', () => {
    expect(normalizePlatform('eBay')).toBe('ebay');
  });

  it('maps "Best Buy" → bestbuy', () => {
    expect(normalizePlatform('Best Buy')).toBe('bestbuy');
  });

  it('maps "Back Market" → back_market', () => {
    expect(normalizePlatform('Back Market')).toBe('back_market');
  });

  it('maps "backmarket.com" → back_market', () => {
    expect(normalizePlatform('backmarket.com')).toBe('back_market');
  });

  it('maps unknown seller → unknown', () => {
    expect(normalizePlatform('Random Shop')).toBe('unknown');
  });

  it('empty seller → unknown', () => {
    expect(normalizePlatform()).toBe('unknown');
  });
});

// ─── computeVendorTrustScore ─────────────────────────────────────────────────

describe('computeVendorTrustScore', () => {
  it('offer with no seller → score=55 (unknown baseline)', () => {
    const { score } = computeVendorTrustScore({});
    expect(score).toBe(VENDOR_TRUST.unknown);
  });

  it('Amazon Renewed refurbished → score=92', () => {
    const { score, platform } = computeVendorTrustScore({ seller: 'Amazon Renewed', condition: 'refurbished' });
    expect(score).toBe(92);
    expect(platform).toBe('amazon_renewed');
  });

  it('eBay refurbished → score=68', () => {
    const { score, platform } = computeVendorTrustScore({ seller: 'eBay', condition: 'refurbished' });
    expect(score).toBe(68);
    expect(platform).toBe('ebay');
  });

  it('Best Buy new → score=87', () => {
    const { score } = computeVendorTrustScore({ seller: 'Best Buy', condition: 'new' });
    expect(score).toBe(87);
  });

  it('Phase 2: activates Bayesian formula when sellerRating + reviewCount present', () => {
    // With high rating (4.9★) and high volume (50000 reviews), score should be above platform base
    const { score } = computeVendorTrustScore({
      seller: 'eBay',
      condition: 'new',
      sellerRating: 4.9,
      reviewCount: 50000
    });
    // Phase 2: composite > eBay base (68) because strong rating boosts it
    expect(score).toBeGreaterThan(VENDOR_TRUST.ebay);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('Phase 2: low-volume seller is shrunk toward global average (Bayesian prior)', () => {
    // 10 reviews at 5.0★ — heavily shrunk toward C=4.2, m=1000
    const { score: lowVolScore } = computeVendorTrustScore({
      seller: 'eBay', condition: 'new', sellerRating: 5.0, reviewCount: 10
    });
    const { score: highVolScore } = computeVendorTrustScore({
      seller: 'eBay', condition: 'new', sellerRating: 5.0, reviewCount: 10000
    });
    expect(highVolScore).toBeGreaterThan(lowVolScore);
  });
});

// ─── filterOffersByOwnershipMethod ───────────────────────────────────────────

describe('filterOffersByOwnershipMethod', () => {
  const OFFERS = [
    { seller: 'Amazon Renewed', condition: 'refurbished', priceUsd: 830, vendorTrustScore: 92 },
    { seller: 'eBay',           condition: 'refurbished', priceUsd: 810, vendorTrustScore: 68 },
    { seller: 'Amazon',         condition: 'new',         priceUsd: 1100, vendorTrustScore: 87 },
  ];

  it('refurbished_if_verified: eBay (68) is excluded, Amazon Renewed (92) passes', () => {
    const { filtered, applied, effectiveMode } =
      filterOffersByOwnershipMethod(OFFERS, 'refurbished_if_verified');
    expect(applied).toBe(true);
    expect(effectiveMode).toBe('refurbished_if_verified');
    expect(filtered.map(o => o.seller)).not.toContain('eBay');
    expect(filtered.map(o => o.seller)).toContain('Amazon Renewed');
  });

  it('refurbished_if_verified: Amazon new at 87 also passes (conditions include new)', () => {
    // refurbished_if_verified accepts BOTH refurbished and new, both need score >= 85
    // Amazon new at 87 passes, so applied=true even though no certified refurbished exists
    const offers = [
      { seller: 'eBay',   condition: 'refurbished', priceUsd: 810,  vendorTrustScore: 68 },
      { seller: 'Amazon', condition: 'new',          priceUsd: 1100, vendorTrustScore: 87 },
    ];
    const { filtered, applied, effectiveMode } =
      filterOffersByOwnershipMethod(offers, 'refurbished_if_verified');
    expect(applied).toBe(true);
    expect(effectiveMode).toBe('refurbished_if_verified');
    expect(filtered.map(o => o.seller)).not.toContain('eBay');
    expect(filtered.map(o => o.seller)).toContain('Amazon');
  });

  it('fallback: when NO offers pass refurbished_if_verified threshold, returns buy_new offers only', () => {
    // Swappa new at 78: fails refurbished_if_verified (78 < 85) but passes buy_new (78 >= 75)
    const offers = [
      { seller: 'eBay',    condition: 'refurbished', priceUsd: 810, vendorTrustScore: 68 },
      { seller: 'Swappa',  condition: 'new',          priceUsd: 900, vendorTrustScore: 78 },
    ];
    const { filtered, applied, effectiveMode } =
      filterOffersByOwnershipMethod(offers, 'refurbished_if_verified');
    expect(applied).toBe(false);
    expect(effectiveMode).toBe('buy_new');
    // fallback applies buy_new filter (new, >= 75): Swappa passes, eBay refurbished does not
    expect(filtered.map(o => o.seller)).not.toContain('eBay');
    expect(filtered.map(o => o.seller)).toContain('Swappa');
  });

  it('buy_new: passes only new condition offers', () => {
    const { filtered, applied, effectiveMode } =
      filterOffersByOwnershipMethod(OFFERS, 'buy_new');
    expect(applied).toBe(true);
    expect(effectiveMode).toBe('buy_new');
    expect(filtered.every(o => o.condition === 'new')).toBe(true);
  });

  it('custom trustThresholds override defaults: applied flag reflects whether thresholds were enforced', () => {
    const offers = [{ seller: 'Swappa', condition: 'new', priceUsd: 800, vendorTrustScore: 78 }];
    // Default buy_new: minTrust=75 → Swappa(78) passes → applied=true
    const { filtered: withDefaults, applied: defaultApplied } = filterOffersByOwnershipMethod(offers, 'buy_new');
    expect(withDefaults).toHaveLength(1);
    expect(defaultApplied).toBe(true);
    // Custom thresholds: minTrust=85 → Swappa(78) fails filter → applied=false (fallback active)
    const strict = { buy_new: { minTrust: 85, conditions: ['new'] } };
    const { applied: customApplied } = filterOffersByOwnershipMethod(offers, 'buy_new', strict);
    expect(customApplied).toBe(false);
  });

  it('unknown ownershipMode → applied: false, returns all offers unchanged', () => {
    const { filtered, applied, effectiveMode } =
      filterOffersByOwnershipMethod(OFFERS, 'nonexistent_mode');
    expect(applied).toBe(false);
    expect(effectiveMode).toBe('nonexistent_mode');
    expect(filtered).toHaveLength(OFFERS.length);
  });

  it('backward compat: offer without vendorTrustScore computes score live', () => {
    const offersNoPrescored = [
      { seller: 'Amazon Renewed', condition: 'refurbished', priceUsd: 830 }, // no vendorTrustScore
      { seller: 'eBay',           condition: 'refurbished', priceUsd: 810 }, // no vendorTrustScore
    ];
    const { filtered, applied } =
      filterOffersByOwnershipMethod(offersNoPrescored, 'refurbished_if_verified');
    expect(applied).toBe(true);
    // Amazon Renewed computed live = 92, eBay = 68 → only Amazon Renewed passes
    expect(filtered.map(o => o.seller)).toContain('Amazon Renewed');
    expect(filtered.map(o => o.seller)).not.toContain('eBay');
  });
});

// ─── rankOffersEthically ──────────────────────────────────────────────────────

describe('rankOffersEthically', () => {
  it('cheapest offer always ranks first', () => {
    const offers = [
      { seller: 'eBay',   priceUsd: 800, vendorTrustScore: 68, condition: 'refurbished' },
      { seller: 'Amazon', priceUsd: 900, vendorTrustScore: 87, condition: 'new' },
    ];
    const ranked = rankOffersEthically(offers);
    expect(ranked[0].seller).toBe('eBay');
  });

  it('tied price: higher trust wins', () => {
    const offers = [
      { seller: 'eBay',   priceUsd: 800, vendorTrustScore: 68, condition: 'refurbished' },
      { seller: 'Amazon', priceUsd: 800, vendorTrustScore: 87, condition: 'new' },
    ];
    const ranked = rankOffersEthically(offers);
    expect(ranked[0].seller).toBe('Amazon');
  });

  it('tied price + trust: manufacturer_certified beats amazon_renewed', () => {
    const offers = [
      { seller: 'StoreA', priceUsd: 800, vendorTrustScore: 87, condition: 'new', certifications: ['amazon_renewed'] },
      { seller: 'StoreB', priceUsd: 800, vendorTrustScore: 87, condition: 'new', certifications: ['manufacturer_certified'] },
    ];
    const ranked = rankOffersEthically(offers);
    expect(ranked[0].seller).toBe('StoreB');
  });

  it('tied price + trust + cert: higher review volume wins', () => {
    const offers = [
      { seller: 'LowVol',  priceUsd: 800, vendorTrustScore: 87, condition: 'new', reviewCount: 100 },
      { seller: 'HighVol', priceUsd: 800, vendorTrustScore: 87, condition: 'new', reviewCount: 10000 },
    ];
    const ranked = rankOffersEthically(offers);
    expect(ranked[0].seller).toBe('HighVol');
  });

  it('fully deterministic: same input always produces same order', () => {
    const offers = [
      { seller: 'StoreC', priceUsd: 800, vendorTrustScore: 87, condition: 'new' },
      { seller: 'StoreA', priceUsd: 800, vendorTrustScore: 87, condition: 'new' },
      { seller: 'StoreB', priceUsd: 800, vendorTrustScore: 87, condition: 'new' },
    ];
    const first  = rankOffersEthically(offers).map(o => o.seller);
    const second = rankOffersEthically([...offers].reverse()).map(o => o.seller);
    expect(first).toEqual(second); // alphabetical tiebreaker ensures stable order
    expect(first[0]).toBe('StoreA');
  });
});
