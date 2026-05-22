/**
 * Decision Narrative Service (Explainer)
 * 
 * Role: Presentation Layer.
 * Strategy: "Expert Advisor" tone. 
 * Decoupled: Language and context are provided by the Domain Config.
 */

export class DecisionExplainer {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.aiProvider = options.aiProvider || null; // e.g., Gemini API interface
  }

  /**
   * Main entry point for generating the human story.
   * Returns { story, tradeoff, badNews } — all fields always present.
   */
  async explain(trace, entityName, domainContext = {}) {
    const { useAI = false } = domainContext;

    if (useAI && this.aiProvider) {
      try {
        this.logger.log(`[Explainer] Rendering with AI for: ${entityName}`);
        return await this._renderWithAI(trace, entityName, domainContext);
      } catch (err) {
        this.logger.error("[Explainer] AI Rendering failed, falling back to templates", err);
      }
    }

    const story = this._renderWithTemplates(trace, entityName, domainContext);
    return { story, tradeoff: null, badNews: null };
  }

  /**
   * Explain WHY we didn't pick an entity (Transparency).
   */
  explainExclusion(trace, name, domainContext = {}) {
    const { atlas = {}, locale = "en" } = domainContext;
    const reasons = trace.exclusions.map(id => {
        const key = `reason_${id.replace('gate_', '')}`;
        return atlas[locale]?.[key] || atlas[locale]?.[id] || id;
    });

    if (locale === "ar") {
      return `استبعدنا "${name}" لأنه ${reasons.join(" و ")}.`;
    }
    return `We excluded "${name}" because it ${reasons.join(" and ")}.`;
  }

  _renderWithTemplates(trace, name, domainContext) {
    const {
      atlas = {},
      locale = "en",
      confidence = null,
      relaxedConstraint = null,
      intent = null
    } = domainContext;

    if (!trace.isEligible) return this.explainExclusion(trace, name, domainContext);

    const t = (key, fallback = "") => atlas[locale]?.[key] ?? atlas["en"]?.[key] ?? fallback;

    // Strengths: all dimensions scoring above 60, sorted descending
    const topStrengths = Object.entries(trace.scores || {})
      .filter(([, v]) => typeof v === "number" && v > 60)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => t(id, id.replace(/^score_|_score$/g, "").replace(/_/g, " ")));

    // Sacrifices: human-readable list from sacrifice vector
    const sacrificeList = Object.values(trace.sacrifices || {})
      .map(s => t(`sacrifice_${s.meaning}`, s.meaning?.replace(/_/g, " ") ?? String(s.meaning)))
      .filter(Boolean);

    const confidenceLevel = confidence?.level ?? "high";
    const conflictCount = confidence?.conflicts?.length ?? 0;
    const intentTitle = intent?.title ?? null;
    const futureProjection = intent?.futureProjection ?? null;

    if (locale === "ar") {
      return this._buildArExplanation(name, topStrengths, sacrificeList, confidenceLevel, conflictCount, relaxedConstraint, intentTitle, futureProjection);
    }
    return this._buildEnExplanation(name, topStrengths, sacrificeList, confidenceLevel, conflictCount, relaxedConstraint, intentTitle, futureProjection);
  }

  _buildEnExplanation(name, strengths, sacrifices, confidenceLevel, conflictCount, relaxedConstraint, intentTitle, futureProjection) {
    const parts = [];
    const context = intentTitle ? ` for ${intentTitle}` : "";

    // § 1 — The Recommendation
    if (strengths.length >= 2) {
      parts.push(
        `After evaluating your requirements${context}, the ${name} is the strongest match. ` +
        `It scores exceptionally well on ${strengths.slice(0, 2).join(" and ")}` +
        (strengths[2] ? `, with solid ${strengths[2]} as well` : "") +
        ` — the factors that matter most for your use case.`
      );
    } else if (strengths.length === 1) {
      parts.push(
        `After evaluating your requirements${context}, the ${name} is the strongest match. ` +
        `It particularly excels at ${strengths[0]}, which is the highest-impact factor for your profile.`
      );
    } else {
      parts.push(
        `After evaluating your requirements${context}, the ${name} meets your core needs ` +
        `with consistent capability across the board.`
      );
    }

    // § 2 — Confidence & conflict context
    if (confidenceLevel === "low" && conflictCount > 0) {
      parts.push(
        `I need to be upfront: your requirements contain ${conflictCount > 1 ? `${conflictCount} competing priorities` : "a competing priority"}, ` +
        `which means this recommendation involves real trade-offs. ` +
        `The ${name} navigates those tensions better than any other option in the catalog — ` +
        `but no single machine can fully satisfy every constraint you have set.`
      );
    } else if (confidenceLevel === "medium" && conflictCount > 0) {
      parts.push(
        `Your requirements involve some natural tension — ` +
        `${conflictCount > 1 ? `${conflictCount} priorities are in partial conflict` : "one priority works against another"}. ` +
        `This device handles that tension better than the alternatives, ` +
        `though it is worth understanding exactly where it compromises.`
      );
    }

    // § 3 — Relaxed constraint disclosure
    if (relaxedConstraint) {
      const humanConstraint = relaxedConstraint.replace(/_gate$/, "").replace(/_/g, " ").trim();
      parts.push(
        `Important: to find any viable option at all, the algorithm had to stretch on "${humanConstraint}". ` +
        `This is a genuine compromise — not a failure, but a real signal that your requirements were demanding. Keep it in mind.`
      );
    }

    // § 4 — The Sacrifice Vector
    if (sacrifices.length > 0) {
      const listed = sacrifices.length === 1
        ? sacrifices[0]
        : `${sacrifices.slice(0, -1).join(", ")} and ${sacrifices[sacrifices.length - 1]}`;
      parts.push(
        `Choosing the ${name} means consciously accepting these trade-offs: ${listed}. ` +
        `These are real costs, not marketing caveats. ` +
        `If any of them are critical to your daily workflow, weigh that carefully before committing.`
      );
    } else {
      parts.push(
        `Notably, this device meets all your stated requirements without forcing any significant compromises. ` +
        `That is the best possible outcome — take it.`
      );
    }

    // § 5 — Future projection
    if (futureProjection) {
      parts.push(`Looking ahead: ${futureProjection}`);
    }

    return parts.join("\n\n");
  }

  _buildArExplanation(name, strengths, sacrifices, confidenceLevel, conflictCount, relaxedConstraint, intentTitle, futureProjection) {
    const parts = [];
    const context = intentTitle ? ` لـ${intentTitle}` : "";

    // § 1 — التوصية
    if (strengths.length >= 2) {
      parts.push(
        `بعد تقييم متطلباتك${context}، يبرز ${name} بوصفه الخيار الأمثل. ` +
        `يتميز بشكل استثنائي في ${strengths.slice(0, 2).join(" و ")}` +
        (strengths[2] ? `، مع مستوى جيد في ${strengths[2]} أيضاً` : "") +
        ` — وهي الجوانب الأكثر أهمية لملفك الشخصي.`
      );
    } else if (strengths.length === 1) {
      parts.push(
        `بعد تقييم متطلباتك${context}، يُعدّ ${name} الخيار الأنسب. ` +
        `يتفوق بشكل خاص في ${strengths[0]}، وهو العامل الأكثر تأثيراً في قرارك.`
      );
    } else {
      parts.push(
        `بعد تقييم متطلباتك${context}، يُلبّي ${name} احتياجاتك الأساسية ` +
        `بأداء متسق عبر مختلف الجوانب.`
      );
    }

    // § 2 — مستوى الثقة والتعارضات
    if (confidenceLevel === "low" && conflictCount > 0) {
      parts.push(
        `يجب أن أكون صريحاً: متطلباتك تحتوي على ${conflictCount > 1 ? `${conflictCount} أولويات متعارضة` : "أولوية متعارضة"}، ` +
        `مما يعني أن هذه التوصية تتضمن تسويات حقيقية. ` +
        `يتعامل ${name} مع هذه التوترات أفضل من أي خيار آخر في الكتالوج ` +
        `— لكن لا يوجد جهاز واحد يلبي كل شرط وضعته بالكامل.`
      );
    } else if (confidenceLevel === "medium" && conflictCount > 0) {
      parts.push(
        `متطلباتك تنطوي على توتر طبيعي — ` +
        `${conflictCount > 1 ? `${conflictCount} أولويات في تعارض جزئي` : "إحدى الأولويات تتعارض مع أخرى"}. ` +
        `هذا الجهاز يدير هذا التوتر بشكل أفضل من البدائل، ` +
        `وإن كان من الضروري فهم جوانب التسوية بدقة.`
      );
    }

    // § 3 — الكشف عن القيد المُخفَّف
    if (relaxedConstraint) {
      const humanConstraint = relaxedConstraint.replace(/_gate$/, "").replace(/_/g, " ").trim();
      parts.push(
        `ملاحظة مهمة: لإيجاد أي خيار مناسب، اضطر النظام إلى التساهل في "${humanConstraint}". ` +
        `هذه تسوية حقيقية — ليست إخفاقاً، بل إشارة تدل على أن متطلباتك كانت متطلبة جداً. خذها بعين الاعتبار.`
      );
    }

    // § 4 — متجه التضحية
    if (sacrifices.length > 0) {
      const listed = sacrifices.length === 1
        ? sacrifices[0]
        : `${sacrifices.slice(0, -1).join(" و")} و${sacrifices[sacrifices.length - 1]}`;
      parts.push(
        `اختيار ${name} يعني قبول هذه التسويات بوعي: ${listed}. ` +
        `هذه تكاليف حقيقية، لا مجرد تحفظات تسويقية. ` +
        `إذا كان أي منها حاسماً في عملك اليومي، ففكّر في ذلك بجدية قبل الالتزام.`
      );
    } else {
      parts.push(
        `والجدير بالذكر أن هذا الجهاز يُلبّي جميع متطلباتك دون فرض أي تسويات جوهرية. ` +
        `هذه أفضل نتيجة ممكنة — استفد منها.`
      );
    }

    // § 5 — النظرة المستقبلية
    if (futureProjection) {
      parts.push(`نظرة مستقبلية: ${futureProjection}`);
    }

    return parts.join("\n\n");
  }

  explainStrengths(trace, atlas, locale) {
    const scores = Object.entries(trace.scores)
      .filter(([, val]) => val > 70)
      .sort((a, b) => b[1] - a[1]);

    if (!scores.length) {
      return locale === 'ar' ? 'يستوفي المتطلبات الأساسية' : 'meets core requirements';
    }

    const top = scores.slice(0, 2).map(([id]) => {
      return atlas[locale]?.[id] || atlas['en']?.[id] || id.replace(/score_/, '').replace(/_/g, ' ');
    });

    if (locale === "ar") return `تتميز بـ ${top.join(" و ")}`;
    return `excels in ${top.join(" and ")}`;
  }

  explainSacrifices(trace, atlas, locale) {
    const sacrifices = Object.values(trace.sacrifices || {});
    if (sacrifices.length === 0) return "";
    
    const descriptions = sacrifices.map(s => {
        const meaning = atlas[locale]?.[`sacrifice_${s.meaning}`] || s.meaning;
        return meaning;
    });

    if (locale === "ar") {
      return `لاحظ أنك ستضحي بـ: ${descriptions.join(" و ")}.`;
    }
    return `Note: You are sacrificing ${descriptions.join(" and ")}.`;
  }

  /**
   * The "Expert AI" Presentation Layer.
   * AI doesn't decide; it only narrates the deterministic cognitive state.
   * Returns { story, tradeoff, badNews } as a structured object.
   */
  async _renderWithAI(trace, name, context) {
    const prompt = this.buildPrompt(trace, name, context);
    
    this.logger.log(`[CognitiveRenderer] Sending prompt for "${name}" (Confidence: ${context.confidence?.score}%)`);
    
    const raw = await this.aiProvider.generate(prompt);

    // Parse structured JSON response from AI
    try {
      const cleanedJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      
      console.log("[CognitiveRenderer] Raw JSON:", cleanedJson);

      const parsed = JSON.parse(cleanedJson);
      return {
        story:    typeof parsed.story    === 'string' ? parsed.story.trim()    : raw.trim(),
        tradeoff: typeof parsed.tradeoff === 'string' ? parsed.tradeoff.trim() : null,
        badNews:  typeof parsed.badNews  === 'string' ? parsed.badNews.trim()  : null
      };
    } catch {
      // AI didn't return valid JSON — use raw text as story only
      this.logger.warn('[CognitiveRenderer] AI response was not valid JSON, using as plain story');
      return { story: raw.trim(), tradeoff: null, badNews: null };
    }
  }

  /**
   * Build a Strict Cognitive Prompt.
   * This is the "Brain-to-Voice" bridge.
   * Returns a prompt that instructs the AI to respond with structured JSON.
   */
  buildPrompt(trace, name, context) {
    const { expertIdentity = "Expert", locale = "en", atlas = {} } = context;
    const intent = context.intent || { title: "General Intent", futureProjection: null };
    const confidence = context.confidence || { level: "high", score: 100, conflicts: [] };
    const relaxedConstraint = context.relaxedConstraint || null;
    const isAr = locale === 'ar';
    
    const cognitiveState = {
      subject: name,
      intent: intent.title,
      expertRole: expertIdentity,
      confidenceLevel: confidence.level,
      confidenceScore: confidence.score,
      conflictsFound: (confidence.conflicts || []).map(c => c.pair || c),
      relaxedConstraint,
      futureProjection: intent.futureProjection,
      sacrifices: trace.sacrifices || {},
      defects: {
        primary: context.reviewWarnings?.primary || null,
        secondary: context.reviewWarnings?.secondary || null
      },
      technicalTrace: {
        scores: trace.scores,
        topStrengths: Object.entries(trace.scores || {})
          .filter(([, v]) => typeof v === 'number' && v > 70)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([k]) => k)
      }
    };

    const langInstruction = isAr
      ? 'CRITICAL: The JSON keys must be exactly "story", "tradeoff", and "badNews". The VALUES for these keys MUST be written entirely in Arabic. Use clear, direct professional prose.'
      : 'Respond entirely in English. Use clear, direct professional prose.';

    return `
You are "${expertIdentity}", an expert academic technology advisor.
Your task: explain this device recommendation to a student with intent "${intent.title}".

${langInstruction}

COGNITIVE STATE (deterministic engine output — do NOT invent any specs):
${JSON.stringify(cognitiveState, null, 2)}

WRITING RULES:
1. PERSPECTIVE: Speak as an honest human expert, not a machine. Use "I recommend".
2. STRENGTHS: Highlight the top scoring dimensions in human terms (e.g. battery life, build quality, value).
3. SACRIFICES: Explicitly name every item in "sacrifices" in plain language. Never hide them.
4. DEFECTS: Address any hardware defects in "defects" honestly. Do not downplay them.
5. CONFLICTS: If confidenceLevel is "low" or "medium" and conflictsFound is non-empty, open with a brief honest warning.
${relaxedConstraint ? `6. COMPROMISE: State clearly that the "${relaxedConstraint}" constraint was relaxed to find this option.` : '6. CONSTRAINTS: All constraints were met — state this positively.'}
7. INTEGRITY: Never fabricate specs. Be concise and honest. No marketing fluff.

RESPONSE FORMAT — return ONLY this JSON object, no extra text:
{
  "story": "<2-3 sentence recommendation paragraph — why this device was chosen, key strengths, future outlook>",
  "tradeoff": "<1 concise sentence about the single most significant trade-off or hardware limitation>",
  "badNews": "<1 honest sentence about the main weakness or sacrifice the student must accept>"
}
`;
  }

  /**
   * Highlight the "Sacrifice" based on scores.
   */
  explainTradeoff(trace, atlas, locale) {
    const scores = trace.scores;
    // Domain-specific trade-off logic could be added here or in the atlas
    if (scores.portability_score < 40) return atlas[locale]?.tradeoff_weight || "Heavy build.";
    if (scores.value_score < 40) return atlas[locale]?.tradeoff_price || "Premium price.";
    return null;
  }
}
