/**
 * Decision Explainer — Turning raw Kernel Traces into Human Stories
 * 
 * Strategy: "Expert Advisor" tone. Focus on logical links, trade-offs, and transparency.
 */

export class DecisionExplainer {
  constructor(options = {}) {
    this.locale = options.locale || "en";
    // Atlas of concepts: Mapping Node IDs to human-friendly terms and expert perspectives
    this.atlas = options.atlas || {
      en: {
        within_budget: "your budget limit",
        min_ram: "required multitasking capacity (RAM)",
        portability_score: "ease of mobility",
        performance: "processing speed",
        value_score: "price-to-performance balance",
        thermal_throttle: "heat management",
        gpu_power: "graphics and rendering power",
        weight_impact: "carrying comfort",
        
        // Expert Perspectives
        reason_budget: "is slightly beyond your specified budget",
        reason_performance: "doesn't quite meet the heavy workload requirements for your major",
        reason_ram: "will likely slow down when you have many apps open",
        
        // Trade-off templates
        tradeoff_weight: "It's a powerhouse, but you'll feel the extra weight in your backpack.",
        tradeoff_price: "Excellent specs, though you're paying a premium for the brand and build.",
        tradeoff_battery: "Incredible performance, but keep your charger handy as battery life is the sacrifice."
      },
      ar: {
        within_budget: "الميزانية المحددة",
        min_ram: "سعة الذاكرة (RAM) المطلوبة لتعدد المهام",
        portability_score: "سهولة التنقل والحمل",
        performance: "سرعة المعالجة والأداء",
        value_score: "التوازن بين القيمة والسعر",
        thermal_throttle: "التحكم في الحرارة",
        gpu_power: "قوة معالجة الرسوميات",
        weight_impact: "راحة الحمل والاستخدام",

        // وجهة نظر الخبير
        reason_budget: "يتجاوز الميزانية التي حددتها قليلاً",
        reason_performance: "قد لا يلبي متطلبات العمل الشاق الخاصة بتخصصك",
        reason_ram: "قد تلاحظ بطءاً عند فتح الكثير من البرامج معاً",

        // قوالب التضحيات (Trade-offs)
        tradeoff_weight: "الجهاز قوي جداً، لكنك ستشعر بوزنه الزائد في حقيبتك.",
        tradeoff_price: "مواصفات ممتازة، رغم أنك تدفع مبلغاً إضافياً مقابل جودة التصميم والعلامة التجارية.",
        tradeoff_battery: "أداء مذهل، لكن ابقِ الشاحن قريباً لأن عمر البطارية هو التضحية هنا."
      }
    };
  }

  /**
   * Generate decision story for a specific entity.
   */
  explain(trace, entityName, context = {}) {
    if (!trace.isEligible) {
      return this._explainRejection(trace, entityName);
    }
    return this._explainWinner(trace, entityName, context);
  }

  /**
   * Explain WHY we didn't pick an entity (Transparency).
   */
  explainExclusion(trace, name) {
    const reasons = trace.exclusions.map(id => {
        const key = `reason_${id.replace('gate_', '')}`;
        return this.atlas[this.locale]?.[key] || this.atlas[this.locale]?.[id] || id;
    });

    if (this.locale === "ar") {
      return `استبعدنا "${name}" لأنه ${reasons.join(" و ")}.`;
    }
    return `We excluded "${name}" because it ${reasons.join(" and ")}.`;
  }

  _explainRejection(trace, name) {
    return this.explainExclusion(trace, name);
  }

  _explainWinner(trace, name, context = {}) {
    const scores = Object.entries(trace.scores)
      .filter(([id]) => id.startsWith("score_"))
      .sort((a, b) => b[1] - a[1]);

    const topScore = scores[0];
    const strength = topScore ? (this.atlas[this.locale]?.[topScore[0]] || topScore[0]) : "";
    
    const major = context.major || "general";
    
    if (this.locale === "ar") {
      let story = `نرشح لك "${name}" كخيار أول لأنه يحقق أفضل توازن لمتطلبات ${strength}.`;
      if (major !== "general") {
          story = `بناءً على تخصصك في ${major}، اخترنا "${name}" لقدرته العالية على معالجة أحمال العمل المطلوبة.`;
      }
      return story;
    }

    let story = `We recommend "${name}" because it offers the best balance for ${strength} standards.`;
    if (major !== "general") {
        story = `Given your focus on ${major}, we chose "${name}" for its superior handling of the required workloads.`;
    }
    return story;
  }

  /**
   * Specifically highlight the "Catch" or "Sacrifice" (Trust factor).
   */
  explainTradeoff(trace, entity) {
    // Logic: Look for low scores in high-performance items or physical traits
    const scores = trace.scores;
    const locale = this.locale;
    
    if (scores.portability_score < 40) return this.atlas[locale].tradeoff_weight;
    if (scores.value_score < 40) return this.atlas[locale].tradeoff_price;
    
    // Fallback to review intelligence if provided
    return null; 
  }
}
