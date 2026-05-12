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
  heavy_for_daily_carry:      { category: "portability", severity: "medium", userFacing: "Heavy for daily campus carry", userFacingAr: "ثقيل للحمل اليومي في الجامعة" },
  runs_hot_under_load:        { category: "thermals",    severity: "high",   userFacing: "Gets hot under heavy workloads", userFacingAr: "ترتفع حرارته بشكل ملحوظ تحت الضغط" },
  fan_noise_under_load:       { category: "thermals",    severity: "medium", userFacing: "Fan noise during intensive tasks", userFacingAr: "صوت المراوح مزعج عند العمل المكثف" },
  slow_cold_boot:             { category: "performance", severity: "low",    userFacing: "Slightly slow cold boot", userFacingAr: "إقلاع النظام بطيء نوعاً ما" },
  aggressive_fan_profile:     { category: "thermals",    severity: "high",   userFacing: "Aggressive fan noise under load", userFacingAr: "صوت المراوح عالٍ جداً ومزعج" },
  thermal_management_limitations: { category: "thermals", severity: "high", userFacing: "Potential thermal throttling", userFacingAr: "احتمالية انخفاض الأداء بسبب الحرارة" },

  // بطارية
  battery_below_expectation:  { category: "battery",     severity: "high",   userFacing: "Battery doesn't match advertised claims", userFacingAr: "البطارية لا تصمد كما هو معلن عنها" },
  short_battery_life:         { category: "battery",     severity: "high",   userFacing: "Short battery life", userFacingAr: "عمر البطارية قصير" },
  fast_battery_drain_gaming:  { category: "battery",     severity: "medium", userFacing: "Battery drains fast during gaming", userFacingAr: "استنزاف سريع للبطارية أثناء الألعاب" },
  diminished_battery_endurance: { category: "battery",   severity: "high",   userFacing: "Poor real-world battery endurance", userFacingAr: "أداء البطارية ضعيف في الاستخدام الواقعي" },

  // شاشة / عرض
  dim_display_outdoors:       { category: "display",     severity: "medium", userFacing: "Display hard to see outdoors", userFacingAr: "الشاشة باهتة وصعبة الرؤية في الخارج" },
  limited_color_accuracy:     { category: "display",     severity: "medium", userFacing: "Color accuracy below creative standards", userFacingAr: "دقة الألوان ضعيفة للمصممين" },
  limited_display_luminance:  { category: "display",     severity: "medium", userFacing: "Screen brightness is limited", userFacingAr: "سطوع الشاشة محدود" },

  // بناء / تصميم
  cheap_build_quality:        { category: "build",       severity: "high",   userFacing: "Build quality feels below price point", userFacingAr: "جودة التصنيع ضعيفة مقارنة بالسعر" },
  keyboard_flex:              { category: "build",       severity: "medium", userFacing: "Keyboard flex during typing", userFacingAr: "لوحة المفاتيح تنحني عند الكتابة" },
  trackpad_inconsistency:     { category: "input",       severity: "medium", userFacing: "Trackpad isn't always responsive", userFacingAr: "لوحة اللمس غير مستقرة الاستجابة" },
  structural_rigidity_concerns: { category: "build",    severity: "medium", userFacing: "Minor chassis flexibility noticed", userFacingAr: "مرونة زائدة في هيكل الجهاز" },

  // قيمة / اقتصاد
  overpriced_for_specs:       { category: "value",       severity: "high",   userFacing: "Priced above what specs justify", userFacingAr: "السعر مرتفع جداً مقارنة بالمواصفات" },
  limited_upgrade_path:       { category: "longevity",   severity: "medium", userFacing: "Limited upgrade options", userFacingAr: "خيارات التحديث محدودة مستقبلاً" },

  // عام
  bloatware_preinstalled:     { category: "software",    severity: "low",    userFacing: "Comes with pre-installed bloatware", userFacingAr: "يأتي مع برامج غير ضرورية مثبتة مسبقاً" },
  webcam_below_average:       { category: "peripheral",  severity: "low",    userFacing: "Webcam quality is mediocre", userFacingAr: "جودة الكاميرا ضعيفة" }
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
export function produceReviewIntelligence({ topCons, reviewRiskScore, taxonomy, reviewCount = 0 }) {
  const signals = classifyReviewSignals(topCons, taxonomy);
  const risk = computeReviewRisk({ classifiedSignals: signals, rawRiskScore: reviewRiskScore });

  // Bayesian confidence adjustment (merged from quality-intelligence)
  const bayesian = computeBayesianConfidence({ reviewCount, rawRiskScore: 1 - reviewRiskScore });

  const highSeverity = signals.filter((s) => s.severity === "high");
  const mediumSeverity = signals.filter((s) => s.severity === "medium");
  const lowSeverity = signals.filter((s) => s.severity === "low");

  const orderedSignals = [...highSeverity, ...mediumSeverity, ...lowSeverity];

  return {
    signals,
    risk,
    bayesianScore: bayesian.weightedScore,
    confidenceLevel: bayesian.confidenceLevel,
    primaryWarning: orderedSignals[0]?.userFacing ?? null,
    primaryWarningAr: orderedSignals[0]?.userFacingAr ?? null,
    secondaryWarning: orderedSignals[1]?.userFacing ?? null,
    secondaryWarningAr: orderedSignals[1]?.userFacingAr ?? null,
    hasHighRisk: highSeverity.length > 0
  };
}

// ─────────────────────────────────────────────
// Bayesian Confidence Scoring (unified from quality-intelligence)
// ─────────────────────────────────────────────

const BAYESIAN_DEFAULTS = { confidenceThreshold: 50, globalAverage: 3.5 };

/**
 * Bayesian Weighted Rank — prevents low-sample-size products from dominating.
 * Formula: W = (v*R + m*C) / (v + m)
 *   v = number of reviews, R = average rating, m = confidence threshold, C = global average
 */
export function computeBayesianConfidence({ reviewCount, rawRiskScore, options = {} }) {
  const m = options.confidenceThreshold || BAYESIAN_DEFAULTS.confidenceThreshold;
  const C = options.globalAverage || BAYESIAN_DEFAULTS.globalAverage;
  const R = (rawRiskScore ?? 0.5) * 5; // normalize 0-1 risk to 0-5 rating scale
  const v = reviewCount || 0;

  const weightedScore = (v * R + m * C) / (v + m);

  return {
    weightedScore: Math.round(weightedScore * 100) / 100,
    confidenceLevel: v >= m ? "high" : v >= m * 0.3 ? "medium" : "low",
    sampleSize: v
  };
}

/**
 * Detect recurring fatal flaws across review signals.
 * If a single flaw appears in >= threshold % of reviews, flag it as critical.
 */
export function detectFatalPatterns(signals, totalReviews, threshold = 0.15) {
  const risks = [];
  for (const [node, stats] of Object.entries(signals)) {
    const ratio = (stats.negativeCount || 0) / Math.max(totalReviews, 1);
    if (ratio >= threshold) {
      risks.push({
        node,
        severity: "critical",
        ratio: Math.round(ratio * 100) / 100,
        reason: `Recurring user complaints about ${node} (${Math.round(ratio * 100)}%)`
      });
    }
  }
  return risks;
}
