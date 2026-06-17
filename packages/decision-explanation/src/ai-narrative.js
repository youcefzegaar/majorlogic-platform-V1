/**
 * AI Narrative Builder
 *
 * Constructs prompts and parses AI responses for the "Expert Advisor" narrative.
 * Isolated here so the AI integration can be changed without touching template logic.
 */

import { renderTradeoffFromTrace, renderBadNewsFromTrace } from "./template-narrative.js";

// Extracts factual tokens from a deterministic text string, using trace data to identify
// named entities (score dimensions, sacrifice meanings). Only these data-derived tokens
// are checked — template prose words like "lowest" or "performing" are ignored.
function extractFactualTokens(deterministicText, trace) {
  if (!deterministicText) return [];
  const tokens = new Set();
  for (const n of (deterministicText.match(/\d+/g) ?? [])) tokens.add(n);
  const textLower = deterministicText.toLowerCase();
  for (const key of Object.keys(trace?.scores ?? {})) {
    const name = key.replace(/^(specs_|score_)|_score$/g, "").replace(/_/g, " ").trim().toLowerCase();
    if (name.length >= 4 && textLower.includes(name)) tokens.add(name);
  }
  for (const s of Object.values(trace?.sacrifices ?? {})) {
    const name = ((s.meaning ?? "").replace(/_/g, " ")).trim().toLowerCase();
    if (name.length >= 4 && textLower.includes(name)) tokens.add(name);
  }
  return [...tokens];
}

/**
 * Calls the AI provider to generate a structured { story, tradeoff, badNews } narrative.
 * Falls back through 3 parsing strategies to handle malformed AI responses.
 * Post-validates tradeoff/badNews against deterministic anchors; logs narrative_drift and
 * substitutes the deterministic text for any field missing factual tokens.
 *
 * @param {object} trace
 * @param {string} name - entity title
 * @param {object} context - domainContext (atlas, locale, reviewIntelligence, entitySpecs, …)
 * @param {{ aiProvider, logger }} deps
 */
export async function renderWithAI(trace, name, context, { aiProvider, logger }) {
  const locale = context.locale ?? "en";
  const deterministicTradeoff = renderTradeoffFromTrace(trace, { locale });
  const deterministicBadNews  = renderBadNewsFromTrace(trace, { locale });

  const prompt = buildPrompt(trace, name, context, { deterministicTradeoff, deterministicBadNews });
  logger.log(`[CognitiveRenderer] Sending prompt for "${name}" (Confidence: ${context.confidence?.score}%)`);

  const raw = await aiProvider.generate(prompt);
  const cleanedJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();

  let aiResult = null;

  // Strategy 1: direct JSON.parse (handles clean responses)
  try {
    const parsed = JSON.parse(cleanedJson);
    if (parsed && typeof parsed === "object") {
      aiResult = {
        story:    typeof parsed.story    === "string" && parsed.story.trim()    ? parsed.story.trim()    : null,
        tradeoff: typeof parsed.tradeoff === "string" && parsed.tradeoff.trim() ? parsed.tradeoff.trim() : null,
        badNews:  typeof parsed.badNews  === "string" && parsed.badNews.trim()  ? parsed.badNews.trim()  : null,
      };
    }
  } catch { /* fall through */ }

  // Strategy 2: regex-based field extraction.
  // Handles product names with embedded quotes (e.g. MacBook Air M3 13") that break JSON.parse.
  if (!aiResult) {
    logger.warn("[CognitiveRenderer] JSON.parse failed — attempting regex extraction");
    try {
      const extractField = (fieldName) => {
        const safe = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`"${safe}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
        const m = cleanedJson.match(re);
        return m ? m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\").trim() : null;
      };
      const story    = extractField("story");
      const tradeoff = extractField("tradeoff");
      const badNews  = extractField("badNews");
      if (story) aiResult = { story, tradeoff, badNews };
    } catch { /* fall through */ }
  }

  // Strategy 3: raw text as story — last resort
  if (!aiResult) {
    logger.warn("[CognitiveRenderer] Regex extraction failed — using raw as plain story");
    aiResult = { story: cleanedJson.length > 10 ? cleanedJson : null, tradeoff: null, badNews: null };
  }

  // Drift validation: AI may rephrase but must preserve all factual tokens from deterministic anchors.
  const validateField = (fieldKey, deterministic) => {
    const aiText = aiResult[fieldKey] ?? "";
    const tokens = extractFactualTokens(deterministic, trace);
    if (tokens.length === 0 || !aiText) return deterministic;
    const aiLower = aiText.toLowerCase();
    const missing = tokens.filter(t => !aiLower.includes(t.toLowerCase()));
    if (missing.length > 0) {
      logger.warn(`[CognitiveRenderer] narrative_drift: ${fieldKey} missing tokens [${missing.join(", ")}] — using deterministic text`);
      return deterministic;
    }
    return aiText;
  };

  return {
    story:    aiResult.story,
    tradeoff: validateField("tradeoff", deterministicTradeoff),
    badNews:  validateField("badNews",  deterministicBadNews),
  };
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
export function buildPrompt(trace, name, context, anchors = {}) {
  const {
    expertIdentity = "Expert",
    locale = "en",
    atlas = {},
    reviewIntelligence = null,
    entitySpecs = null,
    cardType = "hero",
    userBudget = null,
    userPreferences = null,
    naturalLanguageIntent = null,
  } = context;

  const intent = context.intent || { title: "General Intent", futureProjection: null };
  const confidence = context.confidence || { level: "high", score: 100, conflicts: [] };
  const relaxedConstraint = context.relaxedConstraint || null;
  const isAr = locale === "ar";

  const t = (id) =>
    atlas[locale]?.[id] || atlas["en"]?.[id] ||
    id.replace(/^score_|_score$/g, "").replace(/_/g, " ");

  const resolvedScores = Object.fromEntries(
    Object.entries(trace.scores || {})
      .filter(([, v]) => typeof v === "number")
      .map(([id, val]) => [t(id), Math.round(val)])
  );

  const topStrengths = Object.entries(trace.scores || {})
    .filter(([, v]) => typeof v === "number" && v > 70)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, val]) => ({ name: t(id), score: Math.round(val) }));

  const resolvedSacrifices = Object.entries(trace.sacrifices || {}).map(([id, s]) => {
    const atlasKey = `sacrifice_${s.meaning}`;
    const humanName =
      atlas[locale]?.[atlasKey] || atlas["en"]?.[atlasKey] ||
      s.meaning?.replace(/_/g, " ") || id;
    return { name: humanName, type: s.type, weight: Math.round((s.severity ?? 0) * 100) + "%" };
  });

  const reviewWarnings = reviewIntelligence ? {
    riskLevel:       reviewIntelligence.risk?.riskLevel           || "low",
    dominantIssue:   reviewIntelligence.risk?.dominantCategory     || null,
    hasHighRisk:     reviewIntelligence.hasHighRisk                || false,
    confirmedIssues: (reviewIntelligence.signals || [])
      .filter(s => s.severity === "high" || s.severity === "medium")
      .map(s => ({
        issue:    isAr ? (s.userFacingAr || s.userFacing) : s.userFacing,
        severity: s.severity,
        category: s.category,
      }))
      .slice(0, 4),
  } : null;

  const budgetContext = (entitySpecs?.price && userBudget) ? {
    devicePrice: entitySpecs.price,
    userBudget,
    delta: Math.round(userBudget - entitySpecs.price),
    fit: entitySpecs.price <= userBudget ? "within_budget" : "over_budget",
  } : null;

  const userPriorities = userPreferences
    ? Object.fromEntries(Object.entries(userPreferences).sort(([, a], [, b]) => b - a))
    : null;

  const slotFraming = {
    hero:         isAr ? "أفضل خيار شامل"        : "best overall pick",
    smart_budget: isAr ? "أفضل قيمة مقابل السعر" : "best value for money",
    future_proof: isAr ? "الأفضل للمدى الطويل"    : "best long-term investment",
  }[cardType] || (isAr ? "الخيار الموصى به" : "recommended choice");

  const cognitiveState = {
    subject:            name,
    slotRole:           slotFraming,
    intent:             intent.title,
    expertRole:         expertIdentity,
    userNaturalLanguageIntent: naturalLanguageIntent || null,
    confidenceLevel:    confidence.level,
    confidenceScore:    confidence.score,
    conflictsFound:     (confidence.conflicts || []).map(c => c.pair || c),
    relaxedConstraint,
    integrityScore:     context.integrityScore ?? 100,
    futureProjection:   intent.futureProjection,
    scores:             resolvedScores,
    topStrengths,
    sacrifices:         resolvedSacrifices,
    reviewWarnings,
    budgetContext,
    hardwareSpecs: entitySpecs ? {
      ramGb:     entitySpecs.ramGb,
      storageGb: entitySpecs.storageGb,
      priceUsd:  entitySpecs.price,
      thermals:  entitySpecs.thermals,
    } : null,
    userPriorities,
  };

  const langInstruction = isAr
    ? 'CRITICAL: The JSON keys must be exactly "story", "tradeoff", and "badNews". The VALUES MUST be written entirely in Arabic. Use clear, direct professional prose.'
    : "Respond entirely in English. Use clear, direct professional prose.";

  const sacrificeRule = resolvedSacrifices.length > 0
    ? `3. SACRIFICES: Explicitly name every sacrifice: ${resolvedSacrifices.map(s => `"${s.name}" (${s.type}, weight ${s.weight})`).join(", ")}. Never hide them.`
    : `3. SACRIFICES: No trade-offs were forced — state this as a clean win.`;

  const defectsRule = reviewWarnings?.confirmedIssues?.length
    ? `4. DEFECTS: Address these confirmed review issues honestly (do not downplay): ${reviewWarnings.confirmedIssues.map(i => `"${i.issue}" [${i.severity}/${i.category}]`).join("; ")}.`
    : `4. DEFECTS: No confirmed hardware warnings — do not fabricate any.`;

  const compromiseRule = relaxedConstraint
    ? `6. COMPROMISE: State that the "${relaxedConstraint}" constraint was relaxed to find this option (integrityScore: ${context.integrityScore ?? 100}%). Be honest about it.`
    : `6. CONSTRAINTS: All constraints were fully met — state this positively.`;

  const budgetRule = budgetContext
    ? `8. BUDGET: Device costs $${budgetContext.devicePrice} vs student budget of $${budgetContext.userBudget} (delta: ${budgetContext.delta >= 0 ? "+" : ""}$${budgetContext.delta}, ${budgetContext.fit}).`
    : "";

  const intentRule = naturalLanguageIntent
    ? `9. USER INTENT: The student said: "${naturalLanguageIntent}". Connect strengths directly to their words.`
    : "";

  const anchor = topStrengths[0] ? `${topStrengths[0].name} (${topStrengths[0].score}/100)` : null;

  return `You are "${expertIdentity}", an expert academic technology advisor.
Your task: write the explanation for why this device is the ${slotFraming} for a student with intent "${intent.title}".

${langInstruction}

COGNITIVE STATE (deterministic engine output — do NOT invent any specs or scores):
${JSON.stringify(cognitiveState, null, 2)}

WRITING RULES — grounded in behavioral decision science:

1. ECHO & ANCHOR (Tversky/Kahneman anchoring effect)
   - If userNaturalLanguageIntent is set, open by restating their need in 3-5 words.
   - Immediately anchor with the top strength: "${anchor || "the top dimension"}".
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

ANCHORED FACTS — verified by the decision engine from real trace data.
Rephrase these for tone and flow. Preserve every factual element (dimension names, numeric scores, gate names). Do NOT soften, omit, or contradict them:
  Tradeoff: ${anchors.deterministicTradeoff ?? "(none)"}
  Bad News: ${anchors.deterministicBadNews ?? "(none)"}

RESPONSE FORMAT — return ONLY this JSON object, no extra text:
{
  "story": "<3 sentences: (1) echo their intent + anchor top strength with score, (2) 2nd-3rd strengths with scores or budget fit, (3) forward projection or slot rationale>",
  "tradeoff": "<1 sentence: the single most significant cost from sacrifices or reviewWarnings — name it with its real-world consequence for their workflow>",
  "badNews": "<1 sentence: the main weakness they must consciously accept — be precise, not alarming. If budget was stretched, say so with the amount.>"
}
`;
}
