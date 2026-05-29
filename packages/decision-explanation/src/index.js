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
    const tradeoff = this._renderTradeoffFromTrace(trace, domainContext);
    const badNews = this._renderBadNewsFromTrace(trace, domainContext);
    return { story, tradeoff, badNews };
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

  _renderTradeoffFromTrace(trace, domainContext = {}) {
    const { locale = 'en' } = domainContext;
    const isAr = locale === 'ar';
    const sacrifices = Object.values(trace.sacrifices || {})
      .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
    if (sacrifices.length > 0) {
      const worst = sacrifices[0];
      const meaning = (worst.meaning ?? '').replace(/_/g, ' ') || 'performance trade-off';
      return isAr
        ? `التسوية الرئيسية: ستلاحظ ${meaning} في الاستخدام اليومي.`
        : `Key trade-off: you will notice ${meaning} in daily use.`;
    }
    const scores = Object.entries(trace.scores || {})
      .filter(([, v]) => typeof v === 'number')
      .sort((a, b) => a[1] - b[1]);
    if (scores.length > 0) {
      const [dim, score] = scores[0];
      const humanDim = dim.replace(/^(specs_|score_)|_score$/g, '').replace(/_/g, ' ');
      return isAr
        ? `${humanDim} (${Math.round(score)}/100) هو الأدنى أداءً في ملفك.`
        : `${humanDim} (${Math.round(score)}/100) is the lowest-performing dimension for your profile.`;
    }
    return isAr ? 'لا توجد تسويات جوهرية.' : 'No significant trade-offs identified.';
  }

  _renderBadNewsFromTrace(trace, domainContext = {}) {
    const { locale = 'en' } = domainContext;
    const isAr = locale === 'ar';
    const gateViolations = Object.values(trace.sacrifices || {})
      .filter(s => s.type === 'gate_violation')
      .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
    if (gateViolations.length > 0) {
      const meaning = (gateViolations[0].meaning ?? '').replace(/_/g, ' ') || 'constraint limitation';
      return isAr
        ? `يجب قبول: ${meaning} لا يصل إلى هدفك بالكامل.`
        : `Must consciously accept: ${meaning} does not fully meet your target.`;
    }
    const softSacrifices = Object.values(trace.sacrifices || {})
      .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
    if (softSacrifices.length > 0) {
      const meaning = (softSacrifices[0].meaning ?? '').replace(/_/g, ' ') || 'dimension compromise';
      return isAr
        ? `نقطة ضعف: ${meaning} أقل مما أشرت إليه كأولوية.`
        : `Weakness: ${meaning} scores below your stated priority.`;
    }
    return isAr ? 'لا توجد نقاط ضعف بارزة.' : 'No prominent weaknesses identified.';
  }

  buildExplanation(trace, profile, runnerUpCard, locale = 'en') {
    const isAr = locale === 'ar';
    const priorities = profile?.preferences ?? {};
    const scores = trace?.scores ?? {};

    const PRIORITY_TO_SCORE = {
      performance: 'performance_score',
      battery:     'battery_score',
      portability: 'portability_score',
      display:     'display_score',
      resale:      'value_score',
      build:       'build_score',
    };

    const sortedPriorities = Object.entries(priorities)
      .filter(([, w]) => typeof w === 'number')
      .sort(([, a], [, b]) => b - a);

    const [topPriorityKey = 'performance', topPriorityWeight = 50] = sortedPriorities[0] ?? [];
    const leadScoreKey = PRIORITY_TO_SCORE[topPriorityKey] ?? `${topPriorityKey}_score`;
    const leadScoreRaw = scores[leadScoreKey] ?? scores[topPriorityKey] ?? null;
    const leadScore = leadScoreRaw != null ? Math.round(leadScoreRaw) : null;

    const headline = { topPriorityKey, topPriorityWeight: Math.round(topPriorityWeight), leadDimension: topPriorityKey, leadScore };

    const reasons = sortedPriorities.slice(0, 3).map(([dimKey, userIdealRaw]) => {
      const userIdeal = Math.round(userIdealRaw);
      const scoreKey = PRIORITY_TO_SCORE[dimKey] ?? `${dimKey}_score`;
      const scoreRaw = scores[scoreKey] ?? scores[dimKey] ?? null;
      const score = scoreRaw != null ? Math.round(scoreRaw) : null;
      const delta = score != null ? score - userIdeal : null;
      const dimLabel = dimKey.replace(/_/g, ' ');

      const levelText = score == null ? (isAr ? 'غير متاح' : 'n/a')
        : score >= 80 ? (isAr ? 'قوي' : 'strong')
        : score >= 60 ? (isAr ? 'جيد' : 'solid')
        : (isAr ? 'محدود' : 'limited');
      const claim = score != null
        ? (isAr ? `${dimLabel} ${levelText} (${score}/100)` : `${dimLabel} is ${levelText} (${score}/100)`)
        : (isAr ? `${dimLabel}: بيانات غير متاحة` : `${dimLabel}: data not available`);
      const consequence = (score == null || delta == null) ? ''
        : delta >= 0
          ? (isAr ? 'يلبي أولويتك — لا تسوية.' : 'Meets your priority — no compromise.')
          : (isAr ? `فجوة ${Math.abs(delta)} نقطة عن هدفك.` : `${Math.abs(delta)}-point gap from your target.`);
      const evidence = score != null
        ? [{ k: 'score', v: `${score}/100` }, { k: isAr ? 'أولويتك' : 'your priority', v: `${userIdeal}/100` }]
        : [];

      return { dimKey, claim, score, userIdeal, delta, consequence, evidence };
    });

    const sacrifices = Object.values(trace?.sacrifices ?? {}).sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
    const cost = sacrifices.length > 0
      ? {
          text: isAr
            ? `التكلفة: ${(sacrifices[0].meaning ?? '').replace(/_/g, ' ')} — تسوية حقيقية.`
            : `Cost: ${(sacrifices[0].meaning ?? '').replace(/_/g, ' ')} — a real trade-off.`,
          sourceNote: isAr ? 'مشتق من متجه التضحية' : 'From sacrifice vector',
          severity: (sacrifices[0].severity ?? 0) > 0.6 ? 'high' : (sacrifices[0].severity ?? 0) > 0.3 ? 'medium' : 'low',
        }
      : {
          text: isAr ? 'لا تسويات جوهرية — يلبي جميع أولوياتك.' : 'No significant trade-offs — meets all your stated priorities.',
          sourceNote: isAr ? 'لا قيود مُخففة' : 'No relaxed constraints',
          severity: 'none',
        };

    const runnerUp = runnerUpCard
      ? {
          name: runnerUpCard.title ?? 'Alternative',
          score: runnerUpCard.score ?? null,
          margin: Math.round((runnerUpCard.score ?? 0) - (trace?.overallScore ?? 0)),
          wonOn: [],
          lostOn: [],
          swapHint: isAr
            ? `إذا رفعت أولوية ${topPriorityKey} إلى أعلى، قد يصبح هذا البديل الأفضل.`
            : `If you increase your ${topPriorityKey} priority further, this alternative may become the top pick.`,
        }
      : null;

    const math = {
      rows: sortedPriorities.slice(0, 5).map(([dim, w]) => [dim.replace(/_/g, ' '), `${Math.round(w)}/100`]),
      formula: 'integrityScore = Σ(weight × satisfied) / Σ(weight) × 100',
      irHash: trace?.irHash ?? null,
    };

    return { headline, reasons, cost, runnerUp, math };
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
    // Strategy 1: direct JSON.parse (handles clean responses)
    const cleanedJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanedJson);
      if (parsed && typeof parsed === 'object') {
        return {
          story:    typeof parsed.story    === 'string' && parsed.story.trim()    ? parsed.story.trim()    : null,
          tradeoff: typeof parsed.tradeoff === 'string' && parsed.tradeoff.trim() ? parsed.tradeoff.trim() : null,
          badNews:  typeof parsed.badNews  === 'string' && parsed.badNews.trim()  ? parsed.badNews.trim()  : null
        };
      }
    } catch { /* fall through to Strategy 2 */ }

    // Strategy 2: Regex-based field extraction.
    // Handles cases where product names with embedded quotes (e.g. MacBook Air M3 13")
    // cause JSON.parse to fail. Extracts each field value with a greedy regex that
    // stops at the closing brace of the JSON object.
    this.logger.warn('[CognitiveRenderer] JSON.parse failed — attempting regex extraction');
    try {
      const extractField = (fieldName) => {
        const safe = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`"${safe}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
        const m = cleanedJson.match(re);
        return m ? m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\').trim() : null;
      };
      const story    = extractField('story');
      const tradeoff = extractField('tradeoff');
      const badNews  = extractField('badNews');
      if (story) {
        return { story, tradeoff, badNews };
      }
    } catch { /* fall through to Strategy 3 */ }

    // Strategy 3: raw text as story — last resort
    this.logger.warn('[CognitiveRenderer] Regex extraction failed — using raw as plain story');
    return { story: cleanedJson.length > 10 ? cleanedJson : null, tradeoff: null, badNews: null };
  }

  /**
   * Build a Strict Cognitive Prompt — the "Brain-to-Voice" bridge.
   *
   * Consumes ALL signals the engine and DB produce:
   *   - Atlas-resolved score names (no opaque IDs)
   *   - Atlas-resolved sacrifice names
   *   - Review intelligence signals (classified, severity-ordered)
   *   - Budget delta (device price vs user budget)
   *   - Hardware specs (RAM, storage, thermals)
   *   - User preferences (what they stated they care about)
   *   - Natural language intent (the student's own words)
   *   - Slot role (hero / smart_budget / future_proof)
   *   - Integrity score (how much was compromised in recovery)
   */
  buildPrompt(trace, name, context) {
    const {
      expertIdentity = "Expert",
      locale = "en",
      atlas = {},
      reviewIntelligence = null,
      entitySpecs = null,
      cardType = "hero",
      userBudget = null,
      userPreferences = null,
      naturalLanguageIntent = null
    } = context;

    const intent = context.intent || { title: "General Intent", futureProjection: null };
    const confidence = context.confidence || { level: "high", score: 100, conflicts: [] };
    const relaxedConstraint = context.relaxedConstraint || null;
    const isAr = locale === 'ar';

    // Resolve an atlas ID to its human-readable label in the current locale
    const t = (id) =>
      atlas[locale]?.[id] || atlas['en']?.[id] ||
      id.replace(/^score_|_score$/g, '').replace(/_/g, ' ');

    // ── Scores: opaque IDs → human names ────────────────────────────────
    const resolvedScores = Object.fromEntries(
      Object.entries(trace.scores || {})
        .filter(([, v]) => typeof v === 'number')
        .map(([id, val]) => [t(id), Math.round(val)])
    );

    // Top 3 strengths above 70, human-named with scores
    const topStrengths = Object.entries(trace.scores || {})
      .filter(([, v]) => typeof v === 'number' && v > 70)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, val]) => ({ name: t(id), score: Math.round(val) }));

    // ── Sacrifices: IDs → atlas-resolved human descriptions ─────────────
    const resolvedSacrifices = Object.entries(trace.sacrifices || {}).map(([id, s]) => {
      const atlasKey = `sacrifice_${s.meaning}`;
      const humanName =
        atlas[locale]?.[atlasKey] || atlas['en']?.[atlasKey] ||
        s.meaning?.replace(/_/g, ' ') || id;
      return {
        name: humanName,
        type: s.type,             // gate_violation | soft_sacrifice
        weight: Math.round((s.severity ?? 0) * 100) + '%'
      };
    });

    // ── Review intelligence: classified signals from DB ──────────────────
    // Previously always null because reviewWarnings was never set on domainContext.
    const reviewWarnings = reviewIntelligence ? {
      riskLevel:     reviewIntelligence.risk?.riskLevel     || 'low',
      dominantIssue: reviewIntelligence.risk?.dominantCategory || null,
      hasHighRisk:   reviewIntelligence.hasHighRisk          || false,
      confirmedIssues: (reviewIntelligence.signals || [])
        .filter(s => s.severity === 'high' || s.severity === 'medium')
        .map(s => ({
          issue:    isAr ? (s.userFacingAr || s.userFacing) : s.userFacing,
          severity: s.severity,
          category: s.category
        }))
        .slice(0, 4)
    } : null;

    // ── Budget context: device price vs student budget ───────────────────
    const budgetContext = (entitySpecs?.price && userBudget) ? {
      devicePrice: entitySpecs.price,
      userBudget,
      delta:       Math.round(userBudget - entitySpecs.price),
      fit:         entitySpecs.price <= userBudget ? 'within_budget' : 'over_budget'
    } : null;

    // ── User priorities: sorted by weight (highest first) ───────────────
    const userPriorities = userPreferences
      ? Object.fromEntries(
          Object.entries(userPreferences).sort(([, a], [, b]) => b - a)
        )
      : null;

    // ── Slot framing: drives opening sentence tone ───────────────────────
    const slotFraming = {
      hero:         isAr ? 'أفضل خيار شامل'            : 'best overall pick',
      smart_budget: isAr ? 'أفضل قيمة مقابل السعر'     : 'best value for money',
      future_proof: isAr ? 'الأفضل للمدى الطويل'        : 'best long-term investment'
    }[cardType] || (isAr ? 'الخيار الموصى به' : 'recommended choice');

    // ── Full cognitive state ─────────────────────────────────────────────
    const cognitiveState = {
      subject:        name,
      slotRole:       slotFraming,
      intent:         intent.title,
      expertRole:     expertIdentity,

      // The student's own words — ground the narrative in their intent
      userNaturalLanguageIntent: naturalLanguageIntent || null,

      // Confidence & conflict analysis
      confidenceLevel:  confidence.level,
      confidenceScore:  confidence.score,
      conflictsFound:   (confidence.conflicts || []).map(c => c.pair || c),
      relaxedConstraint,
      integrityScore:   context.integrityScore ?? 100,

      // Future projection for the chosen major
      futureProjection: intent.futureProjection,

      // All scores with human-readable dimension names
      scores:     resolvedScores,
      topStrengths,

      // All sacrifices with human-readable descriptions
      sacrifices: resolvedSacrifices,

      // Review signals from DB (classified, severity-ordered)
      reviewWarnings,

      // Budget fit
      budgetContext,

      // Hardware specs for spec-grounded claims
      hardwareSpecs: entitySpecs ? {
        ramGb:      entitySpecs.ramGb,
        storageGb:  entitySpecs.storageGb,
        priceUsd:   entitySpecs.price,
        thermals:   entitySpecs.thermals
      } : null,

      // What the student said they value most
      userPriorities
    };

    // ── Dynamic writing rules derived from actual data ───────────────────
    const langInstruction = isAr
      ? 'CRITICAL: The JSON keys must be exactly "story", "tradeoff", and "badNews". The VALUES MUST be written entirely in Arabic. Use clear, direct professional prose.'
      : 'Respond entirely in English. Use clear, direct professional prose.';

    const sacrificeRule = resolvedSacrifices.length > 0
      ? `3. SACRIFICES: Explicitly name every sacrifice: ${resolvedSacrifices.map(s => `"${s.name}" (${s.type}, weight ${s.weight})`).join(', ')}. Never hide them.`
      : `3. SACRIFICES: No trade-offs were forced — state this as a clean win.`;

    const defectsRule = reviewWarnings?.confirmedIssues?.length
      ? `4. DEFECTS: Address these confirmed review issues honestly (do not downplay): ${reviewWarnings.confirmedIssues.map(i => `"${i.issue}" [${i.severity}/${i.category}]`).join('; ')}.`
      : `4. DEFECTS: No confirmed hardware warnings — do not fabricate any.`;

    const compromiseRule = relaxedConstraint
      ? `6. COMPROMISE: State that the "${relaxedConstraint}" constraint was relaxed to find this option (integrityScore: ${context.integrityScore ?? 100}%). Be honest about it.`
      : `6. CONSTRAINTS: All constraints were fully met — state this positively.`;

    const budgetRule = budgetContext
      ? `8. BUDGET: Device costs $${budgetContext.devicePrice} vs student budget of $${budgetContext.userBudget} (delta: ${budgetContext.delta >= 0 ? '+' : ''}$${budgetContext.delta}, ${budgetContext.fit}).`
      : '';

    const intentRule = naturalLanguageIntent
      ? `9. USER INTENT: The student said: "${naturalLanguageIntent}". Connect strengths directly to their words.`
      : '';

    // Anchor sentence hint: the strongest concrete score for the opening
    const anchor = topStrengths[0]
      ? `${topStrengths[0].name} (${topStrengths[0].score}/100)`
      : null;

    return `You are "${expertIdentity}", an expert academic technology advisor.
Your task: write the explanation for why this device is the ${slotFraming} for a student with intent "${intent.title}".

${langInstruction}

COGNITIVE STATE (deterministic engine output — do NOT invent any specs or scores):
${JSON.stringify(cognitiveState, null, 2)}

WRITING RULES — grounded in behavioral decision science:

1. ECHO & ANCHOR (Tversky/Kahneman anchoring effect)
   - If userNaturalLanguageIntent is set, open by restating their need in 3-5 words.
   - Immediately anchor with the top strength: "${anchor || 'the top dimension'}".
   - Example opener: "For [their words], this machine leads with [top strength] — the strongest fit in your profile."
   - Do NOT open with "I recommend" — open with their intent, then the score.

2. SPECIFICITY OVER VAGUENESS (Hsee 1998 evaluability theory)
   - Never say "excellent", "strong", or "good" without citing the score from topStrengths.
   - Always write: "[dimension name] scores [N]/100" — not just "performs well".
   - Mention all topStrengths entries (up to 3) with their numeric scores.

${sacrificeRule}

${defectsRule}

5. LOSS FRAMING (Kahneman loss aversion — losses feel 2× stronger than gains)
   - Name each sacrifice as a concrete workflow cost, not an abstract label.
   - Bad: "sacrifices portability" — Good: "you'll carry more weight across campus daily".
   - If reviewWarnings.confirmedIssues exist, name the highest-severity one in tradeoff.

6. CONFLICT DISCLOSURE
   If confidenceLevel is "low" or "medium" and conflictsFound is non-empty, open story with a one-line warning before the recommendation: "Your priorities have a tension — [name it briefly]."

${compromiseRule}

7. PEAK-END STRUCTURE (Kahneman peak-end rule)
   - story sentence 1: ECHO + ANCHOR (intent echo → top strength score).
   - story sentence 2: 2nd and 3rd strengths with scores, or budget context if compelling.
   - story sentence 3: FORWARD PROJECTION — if futureProjection is set, end here. Otherwise, close with the slot role rationale.
   The last sentence must leave the student feeling informed and forward-looking, not anxious.

8. INTEGRITY
   Never fabricate any spec, score, or review signal not present in cognitiveState.
   No marketing language ("incredible", "perfect", "amazing"). Honest precision builds trust.

${budgetRule}
${intentRule}

RESPONSE FORMAT — return ONLY this JSON object, no extra text:
{
  "story": "<3 sentences: (1) echo their intent + anchor top strength with score, (2) 2nd-3rd strengths with scores or budget fit, (3) forward projection or slot rationale>",
  "tradeoff": "<1 sentence: the single most significant cost from sacrifices or reviewWarnings — name it with its real-world consequence for their workflow>",
  "badNews": "<1 sentence: the main weakness they must consciously accept — be precise, not alarming. If budget was stretched, say so with the amount.>"
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
