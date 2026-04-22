import { Fetcher } from "./Fetcher.js";
import { AmazonAdapter } from "./AmazonAdapter.js";

/**
 * CatalogGenerator — المنسق الرئيسي لعملية توليد الكتالوج.
 * يربط بين طبقات الاستحواذ، التقنين، والقرار.
 */
export class CatalogGenerator {
  constructor(options = {}) {
    this.fetcher = new Fetcher(options.fetcherOptions);
    this.adapters = {
      amazon: new AmazonAdapter(this.fetcher)
      // يمكن إضافة محولات أخرى هنا (مثل BestBuyAdapter)
    };
  }

  /**
   * تشغيل دورة جلب وبيانات كاملة لدومين معين.
   */
  async runAcquisition(domainPack, sourceDefinitions) {
    console.log(`[Generator] Starting acquisition for domain: ${domainPack.meta.domainId}`);
    
    const rawObservations = [];
    
    for (const sourceDef of sourceDefinitions) {
      try {
        const adapter = this.adapters[sourceDef.platform.toLowerCase()];
        if (!adapter) {
          console.warn(`[Generator] No adapter found for platform: ${sourceDef.platform}`);
          continue;
        }

        console.log(`[Generator] Fetching from ${sourceDef.platform}: ${sourceDef.url}`);
        const observation = await adapter.acquire(sourceDef.url);
        
        // ربط الملاحظة بالـ Domain Pack لتحويلها لشكل موحد
        const rawObs = domainPack.acquireRawObservation({
          ...observation,
          ...sourceDef.overrides // السماح بتجاوز البيانات إذا لزم الأمر
        });

        rawObservations.push(rawObs);
      } catch (err) {
        console.error(`[Generator] Failed to acquire from ${sourceDef.url}:`, err.message);
      }
    }

    return rawObservations;
  }

  /**
   * معالجة الملاحظات الخام عبر طبقات التقنين والفلترة.
   */
  processPipeline(rawObservations, domainPack, normalizationModule) {
    console.log(`[Generator] Processing ${rawObservations.length} observations through normalization...`);
    
    // الطبقة 4: التقنين (Normalization)
    const { normalized, errors } = normalizationModule.normalizeObservations({
      rawObservations,
      domainPack
    });

    if (errors.length > 0) {
      console.warn(`[Generator] Encountered ${errors.length} normalization errors.`);
    }

    // الطبقة 3: فلترة الحد الأدنى (Criteria Sensor / Sanity Gate)
    const { valid, rejected } = normalizationModule.filterMinimumViable(normalized, {
      minPriceUsd: 100 // مثال: لا نقبل أقل من 100 دولار للابتوبات
    });

    return {
      valid,
      rejected,
      errors
    };
  }
}
