// publishEntity
import { normalizeId } from "../../packages/shared-kernel/src/index.js";
import { produceReviewIntelligence } from "../../packages/catalog-review-intelligence/src/index.js";
import { detectBrand, estimateResaleScore, resolveSellerTier, buildProductImageDataUri, resolveFitContext, classifyLaptopCategory } from "./normalizers.js";
import { computeVendorTrustScore } from "../../packages/commercial-routing/src/vendorTrust.js";

function calculateTCO(price, isMac, resaleScore = 55) {
  const base = isMac ? 0.19 : 0.27;
  const adj  = ((resaleScore - 75) / 100) * -0.10;
  const rate = Math.max(0.12, Math.min(0.42, base + adj));
  const resale      = Math.round(price * Math.pow(1 - rate, 4));
  const maintenance = Math.round(price * 0.035 * 4);
  return Math.round(price + maintenance - resale);
}

export function publishEntity(observation, { fitContexts, resolvedSpecs = null }) {
  const specs = resolvedSpecs || observation.specs;
  const entityId = normalizeId(observation.itemName, observation.variantName);
  const offers = [...observation.offers]
    .map(offer => {
      const { score, platform } = computeVendorTrustScore(offer);
      const tier = resolveSellerTier({ ...offer, platform });
      return { ...offer, vendorTrustScore: score, platform, sellerTier: tier };
    })
    .sort((a, b) => {
      // Primary: prefer trusted sellers (Tier 1-2 before 3-4)
      const tierDiff = a.sellerTier - b.sellerTier;
      if (tierDiff !== 0) return tierDiff;
      // Secondary: lowest price within same trust tier
      return a.priceUsd - b.priceUsd;
    });
  const bestOffer = offers[0];
  const resaleScore = estimateResaleScore({
    itemName: observation.itemName,
    specs: specs,
    trust: observation.trust
  });
  const brand = detectBrand(observation.itemName);
  const laptopCategory = classifyLaptopCategory(brand);

  return {
    entityId,
    entityType: "laptop_variant",
    title: `${observation.itemName} - ${observation.variantName}`,
    itemName: observation.itemName,
    variantName: observation.variantName,
    brand,
    topCons: observation.reviewSummary?.topCons ?? [],
    segmentSignals: observation.majorSignals,
    specs: { ...specs, laptopCategory },
    market: {
      bestOffer,
      offers,
      sellerTier: resolveSellerTier(bestOffer)
    },
    trust: {
      sourceConfidence: observation.trust.sourceConfidence,
      reviewCoverage: observation.trust.reviewCoverage,
      freshnessDays: observation.trust.freshnessDays,
      confidenceLevel:
        observation.trust.sourceConfidence >= 0.9 ? "high" :
          observation.trust.sourceConfidence >= 0.8 ? "medium" :
            "low"
    },
    reviewIntelligence: {
      ...produceReviewIntelligence({
        topCons: observation.reviewSummary?.topCons ?? [],
        reviewRiskScore: observation.reviewSummary?.reviewRiskScore ?? 0
      }),
      topPros: observation.reviewSummary?.topPros ?? [],
      userSignals: observation.reviewSummary?.userSignals ?? []
    },
    economicSignals: {
      resaleScore: resaleScore,
      tcoEstimate: calculateTCO(bestOffer?.priceUsd ?? 1000, brand === 'apple', resaleScore)
    },
    media: {
      experience: {
        inspection_mode: "parallax",
        aura: {
          performance_bias: (specs.performance ?? 0) / 100,
          mobility_bias: (specs.portability ?? 0) / 100,
          thermal_intensity: 1 - ((specs.thermals ?? 50) / 100),
          confidence: observation.trust?.sourceConfidence ?? 0.5
        },
        hotspots: (observation.reviewSummary?.topPros ?? []).map((pro, index) => ({
           id: `pro-${index}`,
           type: 'pro',
           label: pro,
           // Simple heuristic for demo: map known keywords to coordinates
           x: pro.toLowerCase().includes('screen') || pro.toLowerCase().includes('display') ? 50 :
              pro.toLowerCase().includes('keyboard') || pro.toLowerCase().includes('trackpad') ? 50 :
              pro.toLowerCase().includes('port') || pro.toLowerCase().includes('usb') ? 20 : 80,
           y: pro.toLowerCase().includes('screen') || pro.toLowerCase().includes('display') ? 30 :
              pro.toLowerCase().includes('keyboard') || pro.toLowerCase().includes('trackpad') ? 70 :
              pro.toLowerCase().includes('port') || pro.toLowerCase().includes('usb') ? 85 : 50
        }))
      },
      assets: {
        productImage: buildProductImageDataUri({
          itemName: observation.itemName,
          variantName: observation.variantName,
          brand
        }),
        hero_render: null,
        model: { glb: null, poster: null }
      }
    },
    fitStates: Object.fromEntries(
      Object.keys(fitContexts).map((segment) => [
        segment,
        resolveFitContext({ ...observation, specs }, segment, fitContexts)
      ])
    ),
    publishedAt: new Date().toISOString()
  };
}
