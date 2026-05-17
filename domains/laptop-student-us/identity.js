// buildEntityFingerprint, resolveEntityFields
import { detectBrand } from "./normalizers.js";

/**
 * بصمة فريدة للابتوبات، تُستخدم بواسطة catalog-identity لدمج السجلات المتكررة.
 * تعتمد على المواصفات التقنية الجوهرية وليس على الاسم التجاري المتغير.
 */
export function buildEntityFingerprint(observation) {
  const brand   = detectBrand(observation.itemName ?? "");
  const ram     = String(observation.specs?.ramGb     ?? 0);
  const storage = String(observation.specs?.storageGb ?? 0);
  const gpu     = (observation.specs?.gpuClass ?? "unk").toLowerCase();
  // نستخدم الاسم المُطبّع للمنتج مع إزالة أرقام النسخ للمرونة
  const name    = (observation.itemName ?? "").toLowerCase()
    .replace(/gen\s*\d+/gi, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .trim();

  return `${brand}__${name}__${ram}gb__${storage}gb__${gpu}`;
}

/**
 * حسم الحقول عند تعارض المصادر لنفس الكيان.
 * الاستراتيجية: الوزن المرجّح بـ sourceConfidence (المصادر الأعلى ثقةً تؤثر أكثر).
 */
export function resolveEntityFields(observations) {
  const totalWeight = observations.reduce((sum, obs) => sum + (obs.trust?.sourceConfidence ?? 0.5), 0) || 1;

  function weightedAvg(key) {
    const weighted = observations.reduce((sum, obs) => {
      const val    = obs.specs?.[key];
      const weight = obs.trust?.sourceConfidence ?? 0.5;
      return typeof val === "number" ? sum + val * weight : sum;
    }, 0);
    const denominator = observations.reduce((sum, obs) => {
      const val = obs.specs?.[key];
      return typeof val === "number" ? sum + (obs.trust?.sourceConfidence ?? 0.5) : sum;
    }, 0) || 1;
    return Math.round(weighted / denominator);
  }

  const resolvedSpecs = {
    ramGb:       weightedAvg("ramGb"),
    storageGb:   weightedAvg("storageGb"),
    performance: weightedAvg("performance"),
    display:     weightedAvg("display"),
    battery:     weightedAvg("battery"),
    portability: weightedAvg("portability"),
    thermals:    weightedAvg("thermals"),
    // للحقول النصية: نأخذ من المصدر الأعلى ثقةً
    gpuClass: observations.reduce((best, obs) => {
      return (obs.trust?.sourceConfidence ?? 0) > (best.trust?.sourceConfidence ?? 0) ? obs : best;
    }, observations[0])?.specs?.gpuClass ?? "integrated"
  };

  const avgConfidence = totalWeight / observations.length;

  return {
    resolvedSpecs,
    confidence: Math.min(1, avgConfidence),
    observationCount: observations.length,
    trustSignals: {
      status: avgConfidence >= 0.80 ? "trusted" : avgConfidence >= 0.60 ? "moderate" : "low_trust",
      avgSourceConfidence: avgConfidence,
      sourceCount: new Set(observations.map((obs) => obs._acquisition?.sourceId ?? obs.sourceName ?? "unknown")).size
    }
  };
}
