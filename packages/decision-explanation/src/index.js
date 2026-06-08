/**
 * Decision Narrative Service (Explainer)
 *
 * Role: Presentation Layer — "Expert Advisor" tone.
 * Decoupled: language and context are provided by the Domain Config.
 *
 * Narrative logic is split across three modules:
 *   - template-narrative.js  — rule-based EN/AR story templates
 *   - ai-narrative.js        — AI prompt construction and response parsing
 *
 * This class orchestrates between the two and exposes the public micro-explainer API.
 */

import { renderWithTemplates, renderTradeoffFromTrace, renderBadNewsFromTrace } from "./template-narrative.js";
import { renderWithAI, buildPrompt as _buildPrompt } from "./ai-narrative.js";

export class DecisionExplainer {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.aiProvider = options.aiProvider || null;
  }

  /**
   * Main entry point — returns { story, tradeoff, badNews }.
   * Prefers AI when available; falls back to template narrative on failure.
   */
  async explain(trace, entityName, domainContext = {}) {
    const { useAI = false } = domainContext;

    if (useAI && this.aiProvider) {
      try {
        this.logger.log(`[Explainer] Rendering with AI for: ${entityName}`);
        return await renderWithAI(trace, entityName, domainContext, {
          aiProvider: this.aiProvider,
          logger: this.logger,
        });
      } catch (err) {
        this.logger.error("[Explainer] AI Rendering failed, falling back to templates", err);
      }
    }

    const story    = renderWithTemplates(trace, entityName, domainContext, { explainExclusion: this.explainExclusion.bind(this) });
    const tradeoff = renderTradeoffFromTrace(trace, domainContext);
    const badNews  = renderBadNewsFromTrace(trace, domainContext);
    return { story, tradeoff, badNews };
  }

  /**
   * Explain WHY we excluded an entity (transparency layer).
   */
  explainExclusion(trace, name, domainContext = {}) {
    const { atlas = {}, locale = "en" } = domainContext;
    const reasons = trace.exclusions.map(id => {
      const key = `reason_${id.replace("gate_", "")}`;
      return atlas[locale]?.[key] || atlas[locale]?.[id] || id;
    });
    if (locale === "ar") return `استبعدنا "${name}" لأنه ${reasons.join(" و ")}.`;
    return `We excluded "${name}" because it ${reasons.join(" and ")}.`;
  }

  /**
   * Structured explanation for the UI explanation panel (M1).
   * Returns { headline, reasons, cost, runnerUp, math }.
   */
  buildExplanation(trace, profile, runnerUpCard, locale = "en", heroScore = null) {
    const isAr = locale === "ar";
    const priorities = profile?.preferences ?? {};
    const scores     = trace?.scores ?? {};

    const PRIORITY_TO_SCORE = {
      performance: "performance_score",
      battery:     "battery_score",
      portability: "portability_score",
      display:     "display_score",
      resale:      "value_score",
      build:       "build_score",
    };

    const sortedPriorities = Object.entries(priorities)
      .filter(([, w]) => typeof w === "number")
      .sort(([, a], [, b]) => b - a);

    const [topPriorityKey = "performance", topPriorityWeight = 50] = sortedPriorities[0] ?? [];
    const leadScoreKey = PRIORITY_TO_SCORE[topPriorityKey] ?? `${topPriorityKey}_score`;
    const leadScoreRaw = scores[leadScoreKey] ?? scores[topPriorityKey] ?? null;
    const leadScore    = leadScoreRaw != null ? Math.round(leadScoreRaw) : null;

    const headline = { topPriorityKey, topPriorityWeight: Math.round(topPriorityWeight), leadDimension: topPriorityKey, leadScore };

    const reasons = sortedPriorities.slice(0, 3).map(([dimKey, userIdealRaw]) => {
      const userIdeal = Math.round(userIdealRaw);
      const scoreKey  = PRIORITY_TO_SCORE[dimKey] ?? `${dimKey}_score`;
      const scoreRaw  = scores[scoreKey] ?? scores[dimKey] ?? null;
      const score     = scoreRaw != null ? Math.round(scoreRaw) : null;
      const delta     = score != null ? score - userIdeal : null;
      const dimLabel  = dimKey.replace(/_/g, " ");

      const levelText = score == null ? (isAr ? "غير متاح" : "n/a")
        : score >= 80 ? (isAr ? "قوي"   : "strong")
        : score >= 60 ? (isAr ? "جيد"   : "solid")
        : (isAr ? "محدود" : "limited");

      const claim = score != null
        ? (isAr ? `${dimLabel} ${levelText} (${score}/100)` : `${dimLabel} is ${levelText} (${score}/100)`)
        : (isAr ? `${dimLabel}: بيانات غير متاحة`            : `${dimLabel}: data not available`);

      const consequence = (score == null || delta == null) ? ""
        : delta >= 0
          ? (isAr ? "يلبي أولويتك — لا تسوية."        : "Meets your priority — no compromise.")
          : (isAr ? `فجوة ${Math.abs(delta)} نقطة عن هدفك.` : `${Math.abs(delta)}-point gap from your target.`);

      const evidence = score != null
        ? [{ k: "score", v: `${score}/100` }, { k: isAr ? "أولويتك" : "your priority", v: `${userIdeal}/100` }]
        : [];

      return { dimKey, claim, score, userIdeal, delta, consequence, evidence };
    });

    const sacrifices = Object.values(trace?.sacrifices ?? {}).sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
    const cost = sacrifices.length > 0
      ? {
          text:       isAr
            ? `التكلفة: ${(sacrifices[0].meaning ?? "").replace(/_/g, " ")} — تسوية حقيقية.`
            : `Cost: ${(sacrifices[0].meaning ?? "").replace(/_/g, " ")} — a real trade-off.`,
          sourceNote: isAr ? "مشتق من متجه التضحية" : "From sacrifice vector",
          severity:   (sacrifices[0].severity ?? 0) > 0.6 ? "high" : (sacrifices[0].severity ?? 0) > 0.3 ? "medium" : "low",
        }
      : {
          text:       isAr
            ? "بياناتنا لم تكشف عن تسوية جوهرية — تحقق من التفاصيل التي تهمك قبل الالتزام."
            : "Our data did not surface a dominant trade-off — verify the details that matter to you before committing.",
          sourceNote: isAr ? "لا تضحيات مسجّلة في البيانات" : "No data-confirmed sacrifice",
          severity:   "none",
        };

    const runnerUp = runnerUpCard
      ? {
          name:    runnerUpCard.title ?? "Alternative",
          score:   runnerUpCard.score ?? null,
          margin:  Math.round((runnerUpCard.score ?? 0) - (heroScore ?? 0)),
          wonOn:   [],
          lostOn:  [],
          swapHint: isAr
            ? `إذا رفعت أولوية ${topPriorityKey} إلى أعلى، قد يصبح هذا البديل الأفضل.`
            : `If you increase your ${topPriorityKey} priority further, this alternative may become the top pick.`,
        }
      : null;

    const math = {
      rows:    sortedPriorities.slice(0, 5).map(([dim, w]) => [dim.replace(/_/g, " "), `${Math.round(w)}/100`]),
      formula: "integrityScore = Σ(weight × satisfied) / Σ(weight) × 100",
      irHash:  trace?.irHash ?? null,
    };

    // tradeoff: populated so sacrifice guard can check content, not just presence
    const tradeoffText = renderTradeoffFromTrace(trace, { locale });
    const tradeoff = {
      text:     tradeoffText,
      severity: cost.severity,
    };

    return { headline, reasons, cost, tradeoff, runnerUp, math };
  }

  // ── Micro-explainers (used by ExplainabilityPanel and card narrative context) ──

  explainStrengths(trace, atlas, locale) {
    const scores = Object.entries(trace.scores)
      .filter(([, val]) => val > 70)
      .sort((a, b) => b[1] - a[1]);

    if (!scores.length) {
      return locale === "ar" ? "يستوفي المتطلبات الأساسية" : "meets core requirements";
    }
    const top = scores.slice(0, 2).map(([id]) =>
      atlas[locale]?.[id] || atlas["en"]?.[id] || id.replace(/score_/, "").replace(/_/g, " ")
    );
    if (locale === "ar") return `تتميز بـ ${top.join(" و ")}`;
    return `excels in ${top.join(" and ")}`;
  }

  explainSacrifices(trace, atlas, locale) {
    const sacrifices = Object.values(trace.sacrifices || {});
    if (sacrifices.length === 0) return "";

    const descriptions = sacrifices.map(s => {
      const key = `sacrifice_${s.meaning}`;
      return atlas[locale]?.[key] || atlas["en"]?.[key] || s.meaning?.replace(/_/g, " ") || "";
    }).filter(Boolean);

    if (locale === "ar") return `لاحظ أنك ستضحي بـ: ${descriptions.join(" و ")}.`;
    return `Note: You are sacrificing ${descriptions.join(" and ")}.`;
  }

  explainTradeoff(trace, atlas, locale) {
    const scores = trace.scores;
    if (scores.portability_score < 40) return atlas[locale]?.tradeoff_weight || "Heavy build.";
    if (scores.value_score < 40)       return atlas[locale]?.tradeoff_price  || "Premium price.";
    return null;
  }

  /** Exposed for testing and external prompt inspection. */
  buildPrompt(trace, name, context) {
    return _buildPrompt(trace, name, context);
  }
}
