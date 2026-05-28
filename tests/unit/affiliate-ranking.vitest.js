import { describe, it, expect } from 'vitest';
import { rankOffersEthically } from '../../packages/commercial-routing/src/vendorTrust.js';

// Regression guard: affiliate placement in the 7-tiebreaker ethical ranking.
// Affiliate is tiebreaker #6 — it may only win when price, trust, certification,
// review volume, and condition all tie between two offers.

describe('affiliate ranking guarantee', () => {
  it('affiliate offer at higher price always loses to cheaper non-affiliate', () => {
    const cheaper    = { priceUsd: 800, vendorTrustScore: 70, affiliate: false, condition: 'new', seller: 'BestBuy' };
    const pricierAff = { priceUsd: 950, vendorTrustScore: 92, affiliate: true,  condition: 'new', seller: 'Amazon' };
    const ranked = rankOffersEthically([pricierAff, cheaper]);
    expect(ranked[0]).toBe(cheaper);
  });

  it('higher-trust non-affiliate beats lower-trust affiliate at same price', () => {
    const highTrust = { priceUsd: 800, vendorTrustScore: 87, affiliate: false, condition: 'new', seller: 'BestBuy' };
    const lowTrust  = { priceUsd: 800, vendorTrustScore: 68, affiliate: true,  condition: 'new', seller: 'eBay' };
    const ranked = rankOffersEthically([lowTrust, highTrust]);
    expect(ranked[0]).toBe(highTrust);
  });

  it('manufacturer-certified non-affiliate beats uncertified affiliate at same price and trust', () => {
    const certified = { priceUsd: 800, vendorTrustScore: 87, affiliate: false, condition: 'new', certifications: ['manufacturer_certified'], seller: 'StoreA' };
    const affNoCert = { priceUsd: 800, vendorTrustScore: 87, affiliate: true,  condition: 'new', certifications: [],                       seller: 'StoreB' };
    const ranked = rankOffersEthically([affNoCert, certified]);
    expect(ranked[0]).toBe(certified);
  });

  it('affiliate only wins when all objective criteria (price, trust, cert, volume, condition) tie', () => {
    const affOffer    = { priceUsd: 800, vendorTrustScore: 87, affiliate: true,  condition: 'new', seller: 'BestBuy-A' };
    const nonAffOffer = { priceUsd: 800, vendorTrustScore: 87, affiliate: false, condition: 'new', seller: 'BestBuy-B' };
    const ranked = rankOffersEthically([nonAffOffer, affOffer]);
    expect(ranked[0]).toBe(affOffer);
  });
});
