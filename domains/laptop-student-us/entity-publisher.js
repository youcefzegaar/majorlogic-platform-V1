// publishEntity
import { normalizeId } from "../../packages/shared-kernel/src/index.js";
import { produceReviewIntelligence } from "../../packages/catalog-review-intelligence/src/index.js";
import { detectBrand, estimateResaleScore, resolveSellerTier, buildProductImageDataUri, resolveFitContext } from "./normalizers.js";

function calculateTCO(entity) {
  const price = entity.market?.bestOffer?.priceUsd ?? 1000;
  const resale = price * ((entity.specs?.resale ?? 30) / 100);
  const maintenance = 150; // 4-year estimate
  return Math.round(price + maintenance - resale);
}

export function publishEntity(observation, { fitContexts, resolvedSpecs = null }) {
  const specs = resolvedSpecs || observation.specs;
  const entityId = normalizeId(observation.itemName, observation.variantName);
  const offers = [...observation.offers].sort((left, right) => left.priceUsd - right.priceUsd);
  const bestOffer = offers[0];
  const resaleScore = estimateResaleScore({
    itemName: observation.itemName,
    specs: specs,
    trust: observation.trust
  });
  const brand = detectBrand(observation.itemName);

  return {
    entityId,
    entityType: "laptop_variant",
    title: `${observation.itemName} - ${observation.variantName}`,
    itemName: observation.itemName,
    variantName: observation.variantName,
    brand,
    segmentSignals: observation.majorSignals,
    specs: specs,
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
      tcoEstimate: calculateTCO({ market: { bestOffer }, specs })
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
