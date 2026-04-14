/**
 * catalog-normalization — Layer 4: Normalization
 *
 * الغرض: تحويل الـ raw observations إلى شكل موحد قبل حل الهوية.
 * تُطبّق دوال التطبيع الخاصة بالدومين عبر domainPack.normalizeAcquiredObservation.
 *
 * مبدأ: المصدر ليس هو الحقيقة — بل إشارة. التطبيع هو البوابة لتبدأ الثقة.
 */

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
  const minPriceUsd = rules.minPriceUsd ?? 1;

  const valid    = [];
  const rejected = [];

  for (const obs of observations) {
    // دعم كلا الشكلين: pre-publish (offers[]) وpost-publish (market.bestOffer)
    const price = obs.market?.bestOffer?.priceUsd
      ?? Math.min(...(obs.offers ?? []).map((o) => o.priceUsd ?? 0).filter((p) => p > 0), Infinity);
    const hasName = Boolean(obs.title ?? obs.itemName);

    if (price >= minPriceUsd && hasName) {
      valid.push(obs);
    } else {
      rejected.push({
        entityId: obs.entityId ?? obs.itemId ?? obs.itemName ?? "unknown",
        reason: !hasName ? "missing_title" : "price_below_minimum"
      });
    }
  }

  return { valid, rejected };
}
