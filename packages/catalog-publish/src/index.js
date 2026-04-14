/**
 * catalog-publish — Layer 8: Publish Orchestrator
 *
 * هذه الطبقة تجمع مسار الـ Pipeline الكامل:
 *   Layer 1+2 : catalog-core    (Acquisition + Staging)
 *   Layer 3   : catalog-identity (Identity Resolution)
 *   Layer 4   : catalog-normalization (Normalization + Min-Viable filter)
 *   Layer 7   : catalog-validation (Truth Resolution + Quality Gates)
 *   Layer 8   : Publish → domainPack.publishEntity()
 *
 * مبدأ: النشر بوابة صارمة — لا ينشر أي كيان لم يجتز جميع الطبقات.
 */

import { acquireAndStage }              from "../../catalog-core/src/index.js";
import { resolveIdentities }            from "../../catalog-identity/src/index.js";
import { normalizeObservations, filterMinimumViable } from "../../catalog-normalization/src/index.js";
import { resolveAndValidateCatalog }    from "../../catalog-validation/src/index.js";

/**
 * المسار الكامل لمولد الكتالوج.
 *
 * @param {object} options
 * @param {Array}  options.sourceRecords    — السجلات الخام
 * @param {object} options.domainPack       — الـ Domain plugin
 * @param {object} [options.domainContext]  — سياق إضافي (fit-contexts, ...)
 * @param {object} [options.meta]           — بيانات وصفية للـ run
 * @param {object} [options.qualityGates]   — { minConfidence, minObservations }
 * @returns {{ publishedEntities, pipelineReport }}
 */
export function runCatalogPipeline({ sourceRecords, domainPack, domainContext = {}, meta = {}, qualityGates = {} }) {
  // Layer 1+2: Acquisition + Staging
  const { rawObservations, stagingResult } = acquireAndStage({ sourceRecords, domainPack, meta });

  // Layer 4 (pre-identity): Normalize raw observations
  const { normalized, errors: normalizationErrors } = normalizeObservations({ rawObservations, domainPack });

  // Min-viable filter before identity resolution
  const { valid: viableObservations, rejected: rejectedMinViable } = filterMinimumViable(normalized);

  // Layer 3: Identity Resolution — دمج المنتجات المتكررة
  const { entities, totalObservations, uniqueEntities, collapsedCount } = resolveIdentities(viableObservations, {
    fingerprintFn: domainPack.buildEntityFingerprint ?? undefined
  });

  // Layer 7: Truth Resolution + Quality Gates
  const { resolved: validatedEntities, blocked } = resolveAndValidateCatalog(entities, {
    qualityGates,
    resolveFieldsFn: domainPack.resolveEntityFields ?? undefined
  });

  // Layer 8: Publish — تحويل كل كيان تحقق إلى entity منشورة
  const publishedEntities = validatedEntities.map((truth) => {
    // أوجد أفضل observation لهذا الكيان (الأعلى confidence) لتمريرها لـ publishEntity
    const sourceEntity = entities.find((e) => e.entityId === truth.entityId);
    const bestObservation = sourceEntity?.observations?.reduce((best, obs) => {
      return (obs.trust?.sourceConfidence ?? 0) > (best.trust?.sourceConfidence ?? 0) ? obs : best;
    }, sourceEntity?.observations?.[0]) ?? null;

    if (!bestObservation) return null;

    return domainPack.publishEntity(bestObservation, domainContext);
  }).filter(Boolean);

  const pipelineReport = {
    stagingResult,
    normalizationErrors,
    rejectedMinViable: rejectedMinViable.length,
    totalObservations,
    uniqueEntities,
    collapsedCount,
    blockedEntities: blocked.length,
    publishedCount: publishedEntities.length
  };

  return { publishedEntities, pipelineReport };
}

/**
 * Legacy compatibility — يُستخدم من system.test.js حالياً.
 * يمر مباشرة عبر domainPack.publishEntity دون Pipeline متعدد الطبقات.
 */
export function generatePublishedCatalog({ observations, domainPack, domainContext }) {
  return observations.map((observation) => domainPack.publishEntity(observation, domainContext));
}
