/**
 * Decision Explainer — Turning raw Kernel Traces into Human Stories
 */

export class DecisionExplainer {
  constructor(options = {}) {
    this.locale = options.locale || "en";
    // Atlas of concepts: Mapping Node IDs to human-friendly terms
    this.atlas = options.atlas || {
      en: {
        within_budget: "user budget",
        min_ram: "required RAM",
        portability_score: "portability and weight",
        performance: "computational performance",
        value_score: "value for money",
        thermal_throttle: "thermal management",
        uptime_sla: "service uptime SLA",
        compute_density: "compute density",
        over_budget: "exceeding budget",
        score_general: "general criteria",
        score_computer_science: "CS workload standards",
        score_graphic_design: "design and display standards",
        score_family_commuter: "family and efficiency standards",
        score_performance: "performance and speed standards"
      },
      ar: {
        within_budget: "الميزانية المحددة",
        min_ram: "سعة الذاكرة العشوائية (RAM)",
        portability_score: "سهولة التنقل والحمل",
        performance: "الأداء وسرعة المعالجة",
        value_score: "القيمة مقابل السعر",
        thermal_throttle: "الحرارة والتهوية",
        uptime_sla: "ضمان الاستمرارية (SLA)",
        compute_density: "كثافة الحوسبة",
        over_budget: "تجاوز الميزانية",
        score_general: "المعايير العامة",
        score_computer_science: "معايير علوم الحاسب",
        score_graphic_design: "معايير التصميم الجرافيكي",
        score_family_commuter: "معايير العائلة والتوفير",
        score_performance: "معايير الأداء والسرعة"
      }
    };
  }

  /**
   * Generate decision story for a specific entity.
   */
  explain(trace, entityName) {
    if (!trace.isEligible) {
      return this._explainRejection(trace, entityName);
    }
    return this._explainWinner(trace, entityName);
  }

  _explainRejection(trace, name) {
    const reasons = trace.exclusions.map(id => this.atlas[this.locale]?.[id] || id);
    if (this.locale === "ar") {
      return `تم استبعاد "${name}" بسبب عدم استيفاء معايير: ${reasons.join("، ")}.`;
    }
    return `"${name}" was excluded due to: ${reasons.join(", ")}.`;
  }

  _explainWinner(trace, name) {
    // Focus on result nodes (starting with score_)
    const scores = Object.entries(trace.scores)
      .filter(([id]) => id.startsWith("score_"))
      .sort((a, b) => b[1] - a[1]);

    const topScore = scores[0];
    const strength = topScore ? (this.atlas[this.locale]?.[topScore[0]] || topScore[0]) : "";
    
    // Look for penalties
    const penalties = trace.steps.filter(s => s.type === "penalty");
    const penaltyWarning = penalties.length > 0 
      ? (this.atlas[this.locale]?.[penalties[0].node] || penalties[0].reason)
      : null;

    if (this.locale === "ar") {
      let story = `وقع الاختيار على "${name}" لتميزه الفائق في ${strength}.`;
      if (penaltyWarning) {
        story += ` مع ملاحظة وجود تحفظ طفيف بشأن ${penaltyWarning}.`;
      }
      return story;
    }

    let story = `"${name}" was chosen for its superior ${strength}.`;
    if (penaltyWarning) {
      story += ` Note: minor concern regarding ${penaltyWarning}.`;
    }
    return story;
  }
}
