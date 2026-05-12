/**
 * catalog-validation — Layer 7: Validation & Truth Resolution
 *
 * الغرض: حسم التعارضات بين المصادر المختلفة لنفس الكيان.
 * إذا قال متجران شيئاً مختلفاً عن RAM أو بطارية جهاز ما،
 * هذه الطبقة تحكم القول الفصل بناءً على قواعد الثقة.
 *
 * مبدأ: الشك الافتراضي — كل بيانات خام مشكوك فيها حتى يثبت العكس.
 */

/**
 * يُحسم قيمة حقل واحد (مثل ramGb, battery) من مصادر متعددة.
 * الاستراتيجية الافتراضية: الوسيط (Median) لمقاومة الأخطاء المتطرفة.
 *
 * @param {Array<number>} values — قيم الحقل من مختلف المصادر
 * @returns {number}
 */
function resolveByMedian(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * يحسب درجة الثقة المجمعة (Confidence) من مجموعة observations.
 * تُعطى أوزان أعلى لـ observations ذات sourceConfidence أعلى.
 *
 * @param {Array} observations
 * @returns {number} — قيمة بين 0 و 1
 */
function aggregateConfidence(observations) {
  if (!observations.length) return 0;
  const total = observations.reduce((sum, obs) => sum + (obs.trust?.sourceConfidence ?? 0), 0);
  return Math.min(1, total / observations.length);
}

/**
 * الدالة الرئيسية لحسم الحقيقة لكيان واحد.
 * تستقبل كيان واحد (entity) مكوّن من عدة observations.
 *
 * @param {object} entity — { entityId, fingerprint, observations }
 * @param {object} [options]
 * @param {Function} [options.resolveFieldsFn] — دالة مخصصة من الدومين لحل الحقول
 * @returns {{ entityId, resolvedSpecs, confidence, observationCount, trustSignals }}
 */
export function resolveEntityTruth(entity, options = {}) {
  const { observations, entityId } = entity;

  if (!observations.length) {
    return {
      entityId,
      resolvedSpecs: {},
      confidence: 0,
      observationCount: 0,
      trustSignals: { status: "no_observations" }
    };
  }

  // إذا كان الدومين لديه منطق حسم مخصص → استخدمه
  if (options.resolveFieldsFn) {
    const domainResolved = options.resolveFieldsFn(observations);
    const conf = aggregateConfidence(observations);
    return {
      entityId,
      ...domainResolved,
      observationCount: observations.length,
      confidence: conf,
      trustSignals: domainResolved.trustSignals ?? {
        status: conf >= 0.80 ? "trusted" : conf >= 0.60 ? "moderate" : "low_trust",
        avgSourceConfidence: conf,
        sourceCount: new Set(observations.map((obs) => obs._acquisition?.sourceId ?? "unknown")).size
      }
    };
  }

  // الحسم العام: استخرج جميع specs عبر الوسيط
  const allSpecKeys = [...new Set(
    observations.flatMap((obs) => Object.keys(obs.specs ?? {}))
  )];

  const resolvedSpecs = {};
  for (const key of allSpecKeys) {
    const values = observations
      .map((obs) => obs.specs?.[key])
      .filter((v) => typeof v === "number");

    if (values.length > 0) {
      resolvedSpecs[key] = resolveByMedian(values);
    } else {
      // للقيم النصية: الأكثر تكراراً يفوز
      const textValues = observations.map((obs) => obs.specs?.[key]).filter((v) => v !== undefined && v !== null);
      const freq = new Map();
      for (const v of textValues) freq.set(v, (freq.get(v) ?? 0) + 1);
      const winner = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
      if (winner) resolvedSpecs[key] = winner[0];
    }
  }

  const confidence = aggregateConfidence(observations);

  return {
    entityId,
    resolvedSpecs,
    observationCount: observations.length,
    confidence,
    trustSignals: {
      status: confidence >= 0.80 ? "trusted" : confidence >= 0.60 ? "moderate" : "low_trust",
      avgSourceConfidence: confidence,
      sourceCount: new Set(observations.map((obs) => obs._acquisition?.sourceId ?? "unknown")).size
    }
  };
}

/**
 * يعمل على مجموعة كاملة من الكيانات.
 *
 * @param {Array}  entities
 * @param {object} [options]
 * @param {object} [options.qualityGates] — { minConfidence, minObservations }
 * @returns {{ resolved: Array, blocked: Array }}
 */
export function resolveAndValidateCatalog(entities, options = {}) {
  const minConfidence = options.qualityGates?.minConfidence ?? 0.50;
  const minObservations = options.qualityGates?.minObservations ?? 1;

  const resolved = [];
  const blocked = [];

  for (const entity of entities) {
    const truth = resolveEntityTruth(entity, options);

    if (
      truth.confidence >= minConfidence &&
      truth.observationCount >= minObservations
    ) {
      resolved.push(truth);
    } else {
      blocked.push({
        ...truth,
        blockReasons: [
          ...(truth.confidence < minConfidence ? ["confidence_too_low"] : []),
          ...(truth.observationCount < minObservations ? ["insufficient_observations"] : [])
        ]
      });
    }
  }

  return { resolved, blocked };
}
