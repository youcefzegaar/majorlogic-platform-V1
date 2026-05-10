/**
 * Quality Intelligence Engine — Risk & Confidence Scoring
 */

export class QualityIntelligence {
  constructor(options = {}) {
    // الحد الأدنى للمراجعات المطلوبة للثقة الكاملة (m)
    this.confidenceThreshold = options.confidenceThreshold || 50;
    // المتوسط العام للمجال (C) - Prior Belief
    this.globalAverage = options.globalAverage || 3.5;
  }

  /**
   * حساب التقييم البايزي الموزون (Bayesian Weighted Rank)
   * يمنع المنتجات الجديدة بـ 5 نجوم من التفوق على المنتجات العريقة بـ 4.5 نجوم
   */
  calculateWeightedScore(v, R) {
    const m = this.confidenceThreshold;
    const C = this.globalAverage;
    
    // معادلة التقييم البايزي
    // W = (v*R + m*C) / (v + m)
    return (v * R + m * C) / (v + m);
  }

  /**
   * استخراج مخاطر العيوب المتكررة (Pattern Risk)
   * إذا تكررت كلمة سلبية بنسبة عالية، يتم اعتبارها "خطر قاتل"
   */
  detectFatalRisks(signals, totalReviews) {
    const risks = [];
    const threshold = 0.15; // 15% تكرار لنفس العيب

    for (const [node, stats] of Object.entries(signals)) {
        const flawRatio = stats.negativeCount / totalReviews;
        if (flawRatio >= threshold) {
            risks.push({
                node,
                severity: "high",
                ratio: flawRatio,
                reason: `Frequent user complaints about ${node} (${Math.round(flawRatio * 100)}%)`
            });
        }
    }
    return risks;
  }
}
