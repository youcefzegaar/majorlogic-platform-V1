/**
 * catalog-review-intelligence — Layer 6: Review Intelligence
 *
 * الغرض: تحويل المراجعات الخام (topCons, reviewRiskScore) إلى إشارات
 * موثوقة يستطيع المحرك وطبقة الشفافية الاستفادة منها.
 *
 * مبدأ: المراجعات ليست حقائق مطلقة — بل إشارات تحتاج تأطير وتصنيف.
 *
 * هذه الطبقة domain-agnostic — تعمل مع أي مجال يمتلك review signals.
 */

/**
 * قاموس التصنيفات العام.
 * كل con يُصنّف ضمن فئة معروفة تُستخدم في الشرح والعرض.
 */
const SIGNAL_TAXONOMY = {
  // أداء / حرارة
  heavy_for_daily_carry:      { category: "portability", severity: "medium", userFacing: "Heavy for daily campus carry" },
  runs_hot_under_load:        { category: "thermals",    severity: "high",   userFacing: "Gets hot under heavy workloads" },
  fan_noise_under_load:       { category: "thermals",    severity: "medium", userFacing: "Fan noise during intensive tasks" },
  slow_cold_boot:             { category: "performance", severity: "low",    userFacing: "Slightly slow cold boot" },

  // بطارية
  battery_below_expectation:  { category: "battery",     severity: "high",   userFacing: "Battery doesn't match advertised claims" },
  short_battery_life:         { category: "battery",     severity: "high",   userFacing: "Short battery life" },
  fast_battery_drain_gaming:  { category: "battery",     severity: "medium", userFacing: "Battery drains fast during gaming" },

  // شاشة / عرض
  dim_display_outdoors:       { category: "display",     severity: "medium", userFacing: "Display hard to see outdoors" },
  limited_color_accuracy:     { category: "display",     severity: "medium", userFacing: "Color accuracy below creative standards" },

  // بناء / تصميم
  cheap_build_quality:        { category: "build",       severity: "high",   userFacing: "Build quality feels below price point" },
  keyboard_flex:              { category: "build",       severity: "medium", userFacing: "Keyboard flex during typing" },
  trackpad_inconsistency:     { category: "input",       severity: "medium", userFacing: "Trackpad isn't always responsive" },

  // قيمة / اقتصاد
  overpriced_for_specs:       { category: "value",       severity: "high",   userFacing: "Priced above what specs justify" },
  limited_upgrade_path:       { category: "longevity",   severity: "medium", userFacing: "Limited upgrade options" },

  // عام
  bloatware_preinstalled:     { category: "software",    severity: "low",    userFacing: "Comes with pre-installed bloatware" },
  webcam_below_average:       { category: "peripheral",  severity: "low",    userFacing: "Webcam quality is mediocre" }
};

/**
 * يُصنّف قائمة topCons إلى إشارات مُؤطّرة.
 *
 * @param {Array<string>} topCons — قائمة المشاكل الخام
 * @param {object} [taxonomy]     — قاموس تصنيف مخصص من الدومين
 * @returns {Array<{ signal, category, severity, userFacing }>}
 */
export function classifyReviewSignals(topCons, taxonomy = SIGNAL_TAXONOMY) {
  return (topCons ?? []).map((con) => {
    const match = taxonomy[con];
    if (match) {
      return {
        signal: con,
        ...match
      };
    }

    return {
      signal: con,
      category: "unknown",
      severity: "low",
      userFacing: con.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    };
  });
}

/**
 * يحسب درجة مخاطر المراجعة المُرجّحة.
 *
 * @param {object} params
 * @param {Array}  params.classifiedSignals — من classifyReviewSignals
 * @param {number} params.rawRiskScore      — من reviewRiskScore الأصلي
 * @returns {{ compositeRisk, riskLevel, dominantCategory, signalCount }}
 */
export function computeReviewRisk({ classifiedSignals, rawRiskScore = 0 }) {
  const severityWeights = { high: 1.0, medium: 0.5, low: 0.2 };

  const weightedSum = classifiedSignals.reduce((sum, s) => {
    return sum + (severityWeights[s.severity] ?? 0.2);
  }, 0);

  // مزج المخاطر: 60% من الإشارات المصنفة + 40% من rawRiskScore
  const compositeRisk = Math.min(1,
    (weightedSum / Math.max(classifiedSignals.length, 1)) * 0.6 +
    rawRiskScore * 0.4
  );

  // حسب الفئة الأكثر تكراراً
  const categoryCount = {};
  for (const s of classifiedSignals) {
    categoryCount[s.category] = (categoryCount[s.category] ?? 0) + 1;
  }
  const dominantCategory = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  return {
    compositeRisk: Math.round(compositeRisk * 100) / 100,
    riskLevel: compositeRisk >= 0.6 ? "high" : compositeRisk >= 0.3 ? "medium" : "low",
    dominantCategory,
    signalCount: classifiedSignals.length
  };
}

/**
 * يُنتج ملخص مراجعة جاهز للعرض في بطاقة القرار.
 *
 * @param {object} params
 * @param {Array<string>} params.topCons
 * @param {number} params.reviewRiskScore
 * @param {object} [params.taxonomy]
 * @returns {{ signals, risk, primaryWarning, secondaryWarning }}
 */
export function produceReviewIntelligence({ topCons, reviewRiskScore, taxonomy }) {
  const signals = classifyReviewSignals(topCons, taxonomy);
  const risk = computeReviewRisk({ classifiedSignals: signals, rawRiskScore: reviewRiskScore });

  const highSeverity = signals.filter((s) => s.severity === "high");
  const mediumSeverity = signals.filter((s) => s.severity === "medium");
  const lowSeverity = signals.filter((s) => s.severity === "low");

  const orderedSignals = [...highSeverity, ...mediumSeverity, ...lowSeverity];

  return {
    signals,
    risk,
    primaryWarning: orderedSignals[0]?.userFacing ?? null,
    secondaryWarning: orderedSignals[1]?.userFacing ?? null,
    hasHighRisk: highSeverity.length > 0
  };
}
