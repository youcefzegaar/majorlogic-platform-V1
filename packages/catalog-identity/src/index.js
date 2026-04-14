/**
 * catalog-identity — Layer 3: Product Identity Resolution
 *
 * الغرض: حل مشكلة تكرار المنتجات عبر المصادر المختلفة.
 * المتجران قد يبيعان نفس اللابتوب بأسماء مختلفة قليلاً.
 * هذه الطبقة تكشف ذلك وتدمجهما تحت كيان (entity) واحد موحد.
 *
 * مبدأ: لا يُرسل لطبقة النشر أي منتج بدون entityId ثابت.
 */

/**
 * بناء fingerprint قابل للمقارنة لكل observation.
 * يعتمد على: المعالج + RAM + Storage + GPU class + brand
 * (وليس على الاسم الكامل لأنه قد يختلف بين متجرين).
 */
function buildFingerprint(normalized) {
  const brand   = (normalized.brand   ?? "unk").toLowerCase().replace(/\s+/g, "_");
  const ram     = String(normalized.specs?.ramGb     ?? 0);
  const storage = String(normalized.specs?.storageGb ?? 0);
  const gpu     = (normalized.specs?.gpuClass ?? "unk").toLowerCase();
  const cpu     = (normalized.specs?.platform ?? normalized.specs?.cpu ?? "unk").toLowerCase().replace(/\s+/g, "_");

  return `${brand}__${cpu}__${ram}gb__${storage}gb__${gpu}`;
}

/**
 * يستقبل قائمة من الـ normalized observations
 * ويُعيد قائمة entity groups كل منها يمثل منتجاً فريداً
 * ويضم جميع observations التي تخصه.
 *
 * @param {Array} normalizedObservations
 * @param {object} [options]
 * @param {Function} [options.fingerprintFn] — دالة بصمة مخصصة من الدومين
 * @returns {Array<{ entityId: string, fingerprint: string, observations: Array }>}
 */
export function resolveIdentities(normalizedObservations, options = {}) {
  const fingerprintFn = options.fingerprintFn ?? buildFingerprint;

  const groups = new Map();

  for (const observation of normalizedObservations) {
    const fingerprint = fingerprintFn(observation);

    if (!groups.has(fingerprint)) {
      groups.set(fingerprint, {
        fingerprint,
        entityId: `entity__${fingerprint}`,
        observations: []
      });
    }

    groups.get(fingerprint).observations.push(observation);
  }

  const resolved = [...groups.values()];

  return {
    entities: resolved,
    totalObservations: normalizedObservations.length,
    uniqueEntities: resolved.length,
    collapsedCount: normalizedObservations.length - resolved.length
  };
}
