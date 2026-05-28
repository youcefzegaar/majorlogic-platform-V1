// acquireRawObservation, normalizeAcquiredObservation
import { parseCapacity, normalizeGpuClass } from "./normalizers.js";

export function acquireRawObservation(sourceRecord) {
  return {
    sourceId: sourceRecord.sourceId,
    sourceType: sourceRecord.sourceType,
    sourceName: sourceRecord.sourceName,
    sourceUrl: sourceRecord.sourceUrl,
    payload: sourceRecord,
    capturedAt: new Date().toISOString()
  };
}

export function normalizeAcquiredObservation(rawObservation) {
  const sourceRecord = rawObservation.payload;

  // دعم البنيتين: البنية الخام (rawSpecs) والبنية المُطبّعة مسبقاً (specs)
  const hasRawSpecs = Boolean(sourceRecord.rawSpecs);

  const specs = hasRawSpecs
    ? {
        platform:    sourceRecord.rawSpecs.cpu ?? "unknown",
        ramGb:       parseCapacity(sourceRecord.rawSpecs.ram),
        storageGb:   parseCapacity(sourceRecord.rawSpecs.storage),
        gpuClass:    normalizeGpuClass(sourceRecord.rawSpecs.gpu),
        performance: Number(sourceRecord.rawSpecs.performance_score),
        display:     Number(sourceRecord.rawSpecs.display_score),
        battery:     Number(sourceRecord.rawSpecs.battery_score),
        portability: Number(sourceRecord.rawSpecs.portability_score),
        thermals:    Number(sourceRecord.rawSpecs.thermals_score)
      }
    : {
        platform:    sourceRecord.specs?.platform ?? sourceRecord.specs?.cpu ?? "unknown",
        ramGb:       Number(sourceRecord.specs?.ramGb     ?? 0),
        storageGb:   Number(sourceRecord.specs?.storageGb  ?? 0),
        gpuClass:    sourceRecord.specs?.gpuClass  ?? "integrated",
        performance: Number(sourceRecord.specs?.performance ?? 0),
        display:     Number(sourceRecord.specs?.display     ?? 0),
        battery:     Number(sourceRecord.specs?.battery     ?? 0),
        portability: Number(sourceRecord.specs?.portability ?? 0),
        thermals:    Number(sourceRecord.specs?.thermals    ?? 0)
      };

  const reviewSummary = hasRawSpecs
    ? {
        topCons:         sourceRecord.reviewEvidence?.topCons ?? [],
        reviewRiskScore: sourceRecord.reviewEvidence?.reviewRiskScore ?? 0
      }
    : {
        topCons:         sourceRecord.reviewSummary?.topCons ?? [],
        topPros:         sourceRecord.reviewSummary?.topPros ?? [],
        userSignals:     sourceRecord.reviewSummary?.userSignals ?? [],
        reviewRiskScore: sourceRecord.reviewSummary?.reviewRiskScore ?? 0,
        sentiment:       sourceRecord.reviewSummary?.sentiment ?? "neutral"
      };

  const trust = hasRawSpecs
    ? {
        sourceConfidence: sourceRecord.trustEvidence?.sourceConfidence ?? 0.5,
        reviewCoverage:   sourceRecord.reviewEvidence?.reviewCoverage  ?? 0,
        freshnessDays:    sourceRecord.trustEvidence?.freshnessDays    ?? 30
      }
    : {
        sourceConfidence: sourceRecord.trust?.sourceConfidence ?? 0.5,
        reviewCoverage:   sourceRecord.trust?.reviewCoverage   ?? 0,
        freshnessDays:    sourceRecord.trust?.freshnessDays    ?? 30
      };

  return {
    sourceName:      sourceRecord.sourceName,
    sourceUrl:       sourceRecord.sourceUrl,
    observationType: sourceRecord.observationType
      ?? `${sourceRecord.sourceType ?? "unknown"}_catalog_snapshot`,
    itemName:     sourceRecord.itemName,
    variantName:  sourceRecord.variantName,
    majorSignals: sourceRecord.majorSignals ?? [],
    specs,
    reviewSummary,
    trust,
    offers: (sourceRecord.offers ?? []).map(offer => ({
      ...offer,
      // Attach product URL if not already present — needed for affiliate links & click-through
      productUrl: offer.productUrl ?? sourceRecord.sourceUrl ?? null,
      sourceType: offer.sourceType ?? sourceRecord.sourceType ?? "unknown"
    }))
  };
}
