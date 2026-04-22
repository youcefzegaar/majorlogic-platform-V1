/**
 * ReviewIntelligenceAnalyzer — المحرك المسؤول عن استخلاص "الحقيقة المرة" من المراجعات.
 * يستخدم الذكاء الاصطناعي لتحويل النصوص غير المنظمة إلى تحذيرات هندسية.
 */
export class ReviewIntelligenceAnalyzer {
  constructor(options = {}) {
    this.provider = options.provider ?? 'gemma-local'; // التوجه الموصى به لتقليل التكلفة
  }

  /**
   * تحليل مجموعة من المراجعات واستخراج العيوب والتحذيرات.
   */
  async analyze(productName, rawSignals) {
    if (!rawSignals || rawSignals.length < 10) {
      return { primaryWarning: "Insufficient review data for deep analysis.", topCons: [], riskScore: 0 };
    }

    console.log(`[AI Analyzer] Processing intelligence for: ${productName} (Provider: ${this.provider})`);

    // المهام في المرحلة الصناعية:
    // 1. بناء الـ Prompt للذكاء الاصطناعي (Gemini/Gemma)
    const prompt = `Analyze professional and user reviews for the "${productName}". 
    Extract the 3 most significant technical flaws (cons) and one critical "Primary Warning" for students.
    Raw Review Text: ${rawSignals.substring(0, 2000)}`;

    // 2. إرسال الطلب للـ Model (هنا نقوم بمحاكاة منطق التحليل اللغوي الحقيقي)
    const response = await this._callLanguageModel(prompt, rawSignals);
    
    return response;
  }

  /**
   * محاكاة ذكية لاتصال الـ API (تتجنب الـ False Positives البسيطة).
   */
  async _callLanguageModel(prompt, context) {
    const lower = context.toLowerCase();
    const cons = [];
    let warning = "No major technical red flags detected.";

    // تحسين الـ Regex ليكون أكثر مرونة
    const batteryIssue = /battery.*(poor|short|bad|awful|disappointing|weak)/i.test(lower) || 
                        /(poor|short|bad|awful|disappointing|weak).*(battery)/i.test(lower);
    
    if (batteryIssue) {
      cons.push("diminished_battery_endurance");
    }
    
    const fanIssue = /(loud|noisy|whine|jet).*(fan|noise)/i.test(lower) || 
                     /(fan|noise).*(loud|noisy|whine|jet)/i.test(lower);

    if (fanIssue) {
      cons.push("aggressive_fan_profile");
      warning = "High acoustic output under load; potentially disruptive in quiet environments.";
    }

    const heatIssue = /(throttling|overheating|gets\s+hot|thermal|burning)/i.test(lower);

    if (heatIssue) {
      cons.push("thermal_management_limitations");
      warning = "Sustained performance may be capped due to thermal design.";
    }

    return {
      primaryWarning: warning,
      topCons: cons.slice(0, 3),
      riskScore: cons.length * 0.2
    };
  }
}
