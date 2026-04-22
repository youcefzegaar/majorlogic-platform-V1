import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POLICIES_PATH = path.join(__dirname, "global-policies.json");

/**
 * شحن السياسات العالمية.
 */
function loadPolicies() {
  try {
    return JSON.parse(fs.readFileSync(POLICIES_PATH, "utf8"));
  } catch (err) {
    console.warn("[Normalization] Failed to load global policies, using fallbacks.");
    return { catalog_entry_policies: { min_spec_floor: { ram_gb: 8, storage_gb: 256 } } };
  }
}

const GLOBAL_POLICIES = loadPolicies();


/**
 * يُطبّع قائمة observations خام.
 *
 * @param {object} options
 * @param {Array}  options.rawObservations
 * @param {object} options.domainPack
 * @returns {{ normalized: Array, errors: Array }}
 */
export function normalizeObservations({ rawObservations, domainPack }) {
  const normalized = [];
  const errors     = [];

  for (const raw of rawObservations) {
    try {
      const result = domainPack.normalizeAcquiredObservation(raw);
      normalized.push(result);
    } catch (err) {
      errors.push({
        sourceId: raw._acquisition?.sourceId ?? "unknown",
        originalIndex: raw._acquisition?.originalIndex ?? null,
        error: err.message ?? String(err)
      });
    }
  }

  return { normalized, errors };
}

/**
 * تحقق صنفي سريع (type-guard) يُتحقق منه قبل الإرسال لحل الهوية.
 * يُعيد قائمة بالـ observations التي اجتازت الحد الأدنى.
 *
 * @param {Array} observations
 * @param {object} [rules]
 * @returns {{ valid: Array, rejected: Array }}
 */
export function filterMinimumViable(observations, rules = {}) {
  const policies = GLOBAL_POLICIES.catalog_entry_policies;
  const minPriceUsd = rules.minPriceUsd ?? 1;

  const valid    = [];
  const rejected = [];

  for (const obs of observations) {
    const price = obs.market?.bestOffer?.priceUsd
      ?? Math.min(...(obs.offers ?? []).map((o) => o.priceUsd ?? 0).filter((p) => p > 0), Infinity);
    const hasName = Boolean(obs.title ?? obs.itemName);
    
    // فحص المعايير الدنيا (The Sensor)
    const specs = obs.specs ?? {};
    const meetsRam = (specs.ramGb ?? 0) >= (policies.min_spec_floor.ram_gb ?? 0);
    const meetsStorage = (specs.storageGb ?? 0) >= (policies.min_spec_floor.storage_gb ?? 0);

    if (price >= minPriceUsd && hasName && meetsRam && meetsStorage) {
      valid.push(obs);
    } else {
      let reason = "failed_sanity_check";
      if (!hasName) reason = "missing_title";
      else if (price < minPriceUsd) reason = "price_below_minimum";
      else if (!meetsRam) reason = "insufficient_ram_floor";
      else if (!meetsStorage) reason = "insufficient_storage_floor";

      rejected.push({
        entityId: obs.entityId ?? obs.itemId ?? obs.itemName ?? "unknown",
        reason
      });
    }
  }

  return { valid, rejected };
}

/**
 * Layer 5: Fit Context Gate — Generic Pre-Publish Standards Filter
 *
 * الغرض: مصفاة معايير الجامعات/المعهد قبل النشر.
 * تُحذف أي observation لا تجتاز الحدَّ الأدنى "official" لأي سياق واحد على الأقل.
 *
 * المبدأ: إذا لم يكن المنتج مؤهلاً لأي تخصص وفق المعايير الرسمية، فلا يحق له دخول الكتالوج.
 * هذا يبقي الـ Published Catalog نقياً ومحرك القرار لا يهدر وقته في إقصاء منتجات يجب ألا تكون موجودة أصلاً.
 *
 * الإبداع في المرونة:
 *  - اختيارية تماماً: إذا لم يُعرّف domainPack.meetsMinimumFitContext، تمر جميع الـ observations (Graceful Degradation).
 *  - مفتوح للتوسع: تعمل مع أي دومين (لابتوبات، كاميرات، عقارات) طالما أن الـ domainPack يُعرّف meetsMinimumFitContext.
 *  - لا تستورد أي منطق من الدومين: تفويض كامل عبر domainPack (Dependency Inversion Principle).
 *
 * @param {Array}  observations    — الـ observations بعد normalizeObservations + filterMinimumViable
 * @param {object} options
 * @param {object} options.fitContexts              — { segment: { official: {...}, safe: {...} } }
 * @param {Function} [options.meetsFitFn]           — domainPack.meetsMinimumFitContext(observation, fitContexts)
 *                                                    يُعيد boolean أو { passed: boolean, failedSegments: string[] }
 * @returns {{ eligible: Array, excluded: Array }}
 */
export function filterByFitContexts(observations, { fitContexts, meetsFitFn } = {}) {
  // إذا لم يُعرَّف fitContexts أو meetsFitFn → Graceful Degradation: نمرر الجميع
  if (!fitContexts || typeof meetsFitFn !== "function") {
    return { eligible: observations, excluded: [] };
  }

  const eligible  = [];
  const excluded  = [];

  for (const obs of observations) {
    try {
      const result = meetsFitFn(obs, fitContexts);
      // نقبل كلا الشكلين: boolean مباشر أو { passed: boolean, failedSegments }
      const passed = typeof result === "boolean" ? result : Boolean(result?.passed);

      if (passed) {
        eligible.push(obs);
      } else {
        excluded.push({
          entityId: obs.entityId ?? obs.itemName ?? "unknown",
          reason: "below_official_in_all_fit_contexts",
          failedSegments: typeof result === "object" ? (result.failedSegments ?? []) : []
        });
      }
    } catch (err) {
      // لا نُوقف الـ pipeline بسبب خطأ في مستشعر واحد
      console.warn(`[FitGate] Error evaluating entity "${obs.itemName}":`, err.message);
      eligible.push(obs); // شك الفائدة → نمررها، المحرك هو الفيصل النهائي
    }
  }

  return { eligible, excluded };
}

