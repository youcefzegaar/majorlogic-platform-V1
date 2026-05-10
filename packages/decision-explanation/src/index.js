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
   */
  async explain(trace, entityName, domainContext = {}) {
    const { atlas = {}, expertIdentity = "Expert Advisor", locale = "en", useAI = false } = domainContext;

    if (useAI && this.aiProvider) {
      try {
        return await this._renderWithAI(trace, entityName, domainContext);
      } catch (err) {
        this.logger.error("[Explainer] AI Rendering failed, falling back to templates", err);
      }
    }

    return this._renderWithTemplates(trace, entityName, atlas, expertIdentity, locale);
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

  _renderWithTemplates(trace, name, atlas, identity, locale) {
    if (!trace.isEligible) return this.explainExclusion(trace, name, { atlas, locale });

    const scores = Object.entries(trace.scores)
      .filter(([id]) => id.startsWith("score_"))
      .sort((a, b) => b[1] - a[1]);

    const topScore = scores[0];
    const strength = topScore ? (atlas[locale]?.[topScore[0]] || topScore[0]) : "";
    
    if (locale === "ar") {
      return `بصفتي ${identity}، أنصح بـ "${name}" كأفضل توازن لمتطلبات ${strength}.`;
    }
    return `As your ${identity}, I recommend "${name}" for its superior ${strength}.`;
  }

  /**
   * The "Expert AI" Presentation Layer.
   * AI doesn't decide; it only narrates the deterministic cognitive state.
   */
  async _renderWithAI(trace, name, context) {
    const prompt = this.buildPrompt(trace, name, context);
    
    this.logger.log(`[CognitiveRenderer] Sending prompt for "${name}" (Confidence: ${context.confidence?.score}%)`);
    
    // In a real scenario, this would call the AI API.
    const narrative = await this.aiProvider.generate(prompt);
    return narrative;
  }

  /**
   * Build a Strict Cognitive Prompt.
   * This is the "Brain-to-Voice" bridge.
   */
  buildPrompt(trace, name, context) {
    const { expertIdentity = "Expert", locale = "en", atlas = {} } = context;
    const intent = context.intent || { title: "General Intent", futureProjection: null };
    const confidence = context.confidence || { level: "high", score: 100, conflicts: [] };
    const relaxedConstraint = context.relaxedConstraint || null;
    
    const cognitiveState = {
        subject: name,
        intent: intent.title,
        expertRole: expertIdentity,
        confidenceLevel: confidence.level,
        confidenceScore: confidence.score,
        conflictsFound: confidence.conflicts.map(c => c.pair),
        relaxedConstraint: relaxedConstraint,
        futureProjection: intent.futureProjection,
        technicalTrace: {
            scores: trace.scores,
            exclusions: trace.exclusions,
            topStrengths: Object.entries(trace.scores)
                .filter(s => s[1] > 70)
                .map(s => s[0])
        }
    };

    return `
      SYSTEM INSTRUCTION:
      You are the "${expertIdentity}". Your role is to explain a deterministic decision result to a user who has the intent: "${intent.title}".
      
      CORE PRINCIPLE: "Truth Capital". 
      If confidence is LOW or MEDIUM, start by addressing the CONFLICTS and TRADE-OFFS. Do not hide them.
      
      TECHNICAL TRUTH:
      ${JSON.stringify(cognitiveState, null, 2)}
      
      LOCALE: ${locale}
      DICTIONARY: ${JSON.stringify(atlas[locale])}
      
      WRITING RULES:
      1. PERSPECTIVE: Speak as a human expert, not a machine.
      2. LOGIC: Explain WHY this choice is logical despite the conflicts: ${cognitiveState.conflictsFound.join(", ")}.
      ${relaxedConstraint ? `3. RELAXATION: You MUST explicitly tell the user that we had to ignore the constraint "${relaxedConstraint}" to find this option.` : `3. CONSTRAINTS: All constraints were met.`}
      4. FUTURE: Incorporate this projection: "${intent.futureProjection || "N/A"}".
      5. INTEGRITY: Never invent specifications not in the technical trace.
      6. TONE: Calm, objective, and deeply helpful.
      
      RESPONSE FORMAT: One or two highly impactful paragraphs.
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
