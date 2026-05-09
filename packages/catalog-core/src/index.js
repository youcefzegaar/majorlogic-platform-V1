export * from "./acquisition/Fetcher.js";
export * from "./acquisition/AmazonAdapter.js";
export * from "./acquisition/CatalogGenerator.js";
export * from "./acquisition/ReviewFetcher.js";
export * from "./acquisition/ReviewIntelligenceAnalyzer.js";
export * from "./orchestration/PipelineManager.js";





/**
 * catalog-core — Layer 1 & 2: Source Acquisition + Raw Staging
 *
 * هذه الطبقة مسؤولة حصرياً عن:
 *   1. استدعاء domainPack لتحويل كل سجل خام إلى observation موحدة الشكل.
 *   2. حفظ الإشارة الكاملة بدون تعديل.
 *
 * مبدأ: لا يُحسم أي تعارض هنا — فقط الاستحواذ والتخزين.
 */

/**
 * @param {object} options
 * @param {Array}  options.sourceRecords  — السجلات الخام من المصادر
 * @param {object} options.domainPack     — الـ Domain plugin المزود بالدوال
 * @param {object} [options.meta]         — بيانات وصفية (مصدر، تاريخ جلب...)
 * @returns {{ rawObservations: Array, stagingResult: object }}
 */
export function acquireAndStage({ sourceRecords, domainPack, meta = {} }) {
  const acquiredAt = meta.acquiredAt ?? new Date().toISOString();
  const sourceId   = meta.sourceId   ?? "unknown_source";

  const rawObservations = sourceRecords.map((record, index) => {
    try {
      const observation = domainPack.acquireRawObservation(record);
      return {
        ...observation,
        _acquisition: {
          sourceId,
          acquiredAt,
          originalIndex: index
        }
      };
    } catch (err) {
      console.error(`[catalog-core] Failed to acquire record at index ${index}:`, err.message);
      return null;
    }
  }).filter(Boolean);

  const stagingResult = {
    sourceId,
    acquiredAt,
    totalAcquired: rawObservations.length,
    domainId: domainPack.meta?.domainId ?? "unknown_domain"
  };

  return { rawObservations, stagingResult };
}

/**
 * Legacy compatibility — يُستخدم من scripts/ingest-domain.js الحالي
 */
export function ingestCatalogSources({ sourceRecords, domainPack }) {
  const rawObservations = sourceRecords.map((record) => domainPack.acquireRawObservation(record));
  const normalizedObservations = rawObservations.map((rawObservation) =>
    domainPack.normalizeAcquiredObservation(rawObservation)
  );

  return {
    rawObservations,
    normalizedObservations
  };
}
