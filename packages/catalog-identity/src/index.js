/**
 * catalog-identity — Advanced Product Identity Resolution Engine
 *
 * الغرض: دمج السجلات المتكررة (Deduplication) عبر مصادر متعددة.
 * الاستراتيجية: مطابقة متدرجة (Identifiers -> Core Specs -> Fuzzy Name).
 */

export class IdentityManager {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.similarityThreshold = options.similarityThreshold || 0.85;
    this.fingerprintFn = options.fingerprintFn || null;
  }

  /**
   * دمج الملاحظات في كيانات موحدة.
   *
   * @param {Array} observations - قائمة الملاحظات المُطبعة
   * @param {object} domainRules - قواعد الهوية الخاصة بالدومين
   */
  resolve(observations, domainRules = {}) {
    this.logger.log(`[Identity] Resolving ${observations.length} observations...`);
    
    const entities = new Map();

    for (const obs of observations) {
      const fingerprint = this.fingerprintFn 
        ? this.fingerprintFn(obs)
        : this._generateFingerprint(obs, domainRules);
      
      if (!entities.has(fingerprint)) {
        entities.set(fingerprint, {
          entityId: `ent_${fingerprint}`,
          fingerprint,
          observations: [],
          coreSpecs: obs.specs // حفظ المواصفات الأساسية للمقارنة اللاحقة
        });
      }
      
      entities.get(fingerprint).observations.push(obs);
    }

    const result = [...entities.values()];

    return {
      entities: result,
      stats: {
        total: observations.length,
        unique: result.length,
        collapsed: observations.length - result.length
      }
    };
  }

  /**
   * توليد بصمة الهوية.
   * المبدأ: الجمع بين المعرفات الصارمة (IDs) والمواصفات التي لا تتغير.
   */
  _generateFingerprint(obs, rules) {
    // 1. استخدام المعرفات الصريحة إذا وجدت (MPN, SKU)
    if (obs.identifiers?.mpn) return `mpn_${obs.identifiers.mpn.toLowerCase()}`;
    
    // 2. البصمة القائمة على المواصفات (Core Specs)
    // نأخذ الحقول التي حددها الدومين كـ "حقول هوية"
    const idFields = rules.identityFields || ["brand", "ramGb", "storageGb", "cpu"];
    
    const parts = idFields.map(field => {
        const val = obs.specs?.[field] || obs[field] || "unk";
        return String(val).toLowerCase().replace(/\s+/g, "");
    });

    // 3. إضافة جزء من الاسم (برموز مبسطة) لمنع التصادم
    // نقوم بإزالة المسافات، الأرقام بين قوسين، والسنوات المشهورة
    const namePart = (obs.itemName || "")
        .toLowerCase()
        .replace(/\(\d+\)/g, "") // إزالة (2024) مثلاً
        .replace(/\d{4}/g, "")   // إزالة أي 4 أرقام متتالية (سنة)
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 10);

    return parts.join("_") + "__" + namePart;
  }
}

/**
 * دالة مساعدة لدمج الحقول المتعارضة (Conflict Resolution).
 * تستخدم الاستراتيجية الموزونة بناءً على ثقة المصدر.
 */
export function resolveConflicts(entityGroup) {
    const observations = entityGroup.observations;
    const resolved = {};
    
    // الحصول على كافة مفاتيح المواصفات المتاحة
    const allKeys = new Set(observations.flatMap(o => Object.keys(o.specs || {})));
    
    for (const key of allKeys) {
        resolved[key] = _getWeightedBest(observations, key);
    }
    
    return resolved;
}

function _getWeightedBest(observations, key) {
    // استراتيجية: القيمة القادمة من مصدر أعلى ثقة تفوز
    const sorted = [...observations].sort((a, b) => 
        (b.trust?.sourceConfidence || 0.5) - (a.trust?.sourceConfidence || 0.5)
    );
    return sorted[0].specs[key];
}

/**
 * Functional wrapper for IdentityManager to support the pipeline orchestrator.
 */
export function resolveIdentities(observations, options = {}) {
    const manager = new IdentityManager({
        similarityThreshold: options.similarityThreshold,
        fingerprintFn: options.fingerprintFn
    });
    
    const domainRules = {
        identityFields: options.identityFields,
        // Map fingerprintFn if provided to the internal logic
        // Note: IdentityManager uses _generateFingerprint which we can override or wrap
    };

    // If a custom fingerprintFn is provided, we should probably respect it.
    // Let's modify IdentityManager to accept a custom fingerprint function.
    const result = manager.resolve(observations, domainRules);

    return {
        entities: result.entities,
        totalObservations: result.stats.total,
        uniqueEntities: result.stats.unique,
        collapsedCount: result.stats.collapsed
    };
}
