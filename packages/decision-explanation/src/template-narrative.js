/**
 * Template Narrative Builder
 *
 * Pure functions for generating rule-based (non-AI) narratives.
 * No external dependencies — just string composition from trace + atlas data.
 */

/**
 * Builds the English explanation narrative (5 sections).
 */
export function buildEnExplanation(name, strengths, sacrifices, confidenceLevel, conflictCount, relaxedConstraint, intentTitle, futureProjection) {
  const parts = [];
  const context = intentTitle ? ` for ${intentTitle}` : "";

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

  if (relaxedConstraint) {
    const humanConstraint = relaxedConstraint.replace(/_gate$/, "").replace(/_/g, " ").trim();
    parts.push(
      `Important: to find any viable option at all, the algorithm had to stretch on "${humanConstraint}". ` +
      `This is a genuine compromise — not a failure, but a real signal that your requirements were demanding. Keep it in mind.`
    );
  }

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
      `Our data did not surface a dominant trade-off for this device against your profile. ` +
      `That does not mean there is none — verify the details that matter most to you before committing.`
    );
  }

  if (futureProjection) {
    parts.push(`Looking ahead: ${futureProjection}`);
  }

  return parts.join("\n\n");
}

/**
 * Builds the Arabic explanation narrative (5 sections, parallel to EN).
 */
export function buildArExplanation(name, strengths, sacrifices, confidenceLevel, conflictCount, relaxedConstraint, intentTitle, futureProjection) {
  const parts = [];
  const context = intentTitle ? ` لـ${intentTitle}` : "";

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

  if (relaxedConstraint) {
    const humanConstraint = relaxedConstraint.replace(/_gate$/, "").replace(/_/g, " ").trim();
    parts.push(
      `ملاحظة مهمة: لإيجاد أي خيار مناسب، اضطر النظام إلى التساهل في "${humanConstraint}". ` +
      `هذه تسوية حقيقية — ليست إخفاقاً، بل إشارة تدل على أن متطلباتك كانت متطلبة جداً. خذها بعين الاعتبار.`
    );
  }

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
      `بياناتنا لم تكشف عن تسوية جوهرية لهذا الجهاز مقابل ملفك الشخصي. ` +
      `هذا لا يعني غياب التسوية — تحقق من التفاصيل الأهم لك قبل الالتزام.`
    );
  }

  if (futureProjection) {
    parts.push(`نظرة مستقبلية: ${futureProjection}`);
  }

  return parts.join("\n\n");
}

/**
 * Selects and formats scores and sacrifices from a trace to produce atlas-localized strings.
 * Returns { story } — the full template narrative.
 */
export function renderWithTemplates(trace, name, domainContext, { explainExclusion }) {
  const {
    atlas = {},
    locale = "en",
    confidence = null,
    relaxedConstraint = null,
    intent = null,
  } = domainContext;

  if (!trace.isEligible) return explainExclusion(trace, name, domainContext);

  const t = (key, fallback = "") => atlas[locale]?.[key] ?? atlas["en"]?.[key] ?? fallback;

  const topStrengths = Object.entries(trace.scores || {})
    .filter(([, v]) => typeof v === "number" && v > 60)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => t(id, id.replace(/^score_|_score$/g, "").replace(/_/g, " ")));

  const sacrificeList = Object.values(trace.sacrifices || {})
    .map(s => t(`sacrifice_${s.meaning}`, s.meaning?.replace(/_/g, " ") ?? String(s.meaning)))
    .filter(Boolean);

  const confidenceLevel  = confidence?.level ?? "high";
  const conflictCount    = confidence?.conflicts?.length ?? 0;
  const intentTitle      = intent?.title ?? null;
  const futureProjection = intent?.futureProjection ?? null;

  if (locale === "ar") {
    return buildArExplanation(name, topStrengths, sacrificeList, confidenceLevel, conflictCount, relaxedConstraint, intentTitle, futureProjection);
  }
  return buildEnExplanation(name, topStrengths, sacrificeList, confidenceLevel, conflictCount, relaxedConstraint, intentTitle, futureProjection);
}

export function renderTradeoffFromTrace(trace, domainContext = {}) {
  const { locale = "en" } = domainContext;
  const isAr = locale === "ar";
  const sacrifices = Object.values(trace.sacrifices || {}).sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  if (sacrifices.length > 0) {
    const meaning = (sacrifices[0].meaning ?? "").replace(/_/g, " ") || "performance trade-off";
    return isAr
      ? `التسوية الرئيسية: ستلاحظ ${meaning} في الاستخدام اليومي.`
      : `Key trade-off: you will notice ${meaning} in daily use.`;
  }
  const scores = Object.entries(trace.scores || {})
    .filter(([, v]) => typeof v === "number")
    .sort((a, b) => a[1] - b[1]);
  if (scores.length > 0) {
    const [dim, score] = scores[0];
    const humanDim = dim.replace(/^(specs_|score_)|_score$/g, "").replace(/_/g, " ");
    return isAr
      ? `${humanDim} (${Math.round(score)}/100) هو الأدنى أداءً في ملفك.`
      : `${humanDim} (${Math.round(score)}/100) is the lowest-performing dimension for your profile.`;
  }
  return isAr ? "لا توجد تسويات جوهرية." : "No significant trade-offs identified.";
}

export function renderBadNewsFromTrace(trace, domainContext = {}) {
  const { locale = "en" } = domainContext;
  const isAr = locale === "ar";
  const gateViolations = Object.values(trace.sacrifices || {})
    .filter(s => s.type === "gate_violation")
    .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  if (gateViolations.length > 0) {
    const meaning = (gateViolations[0].meaning ?? "").replace(/_/g, " ") || "constraint limitation";
    return isAr
      ? `يجب قبول: ${meaning} لا يصل إلى هدفك بالكامل.`
      : `Must consciously accept: ${meaning} does not fully meet your target.`;
  }
  const softSacrifices = Object.values(trace.sacrifices || {}).sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  if (softSacrifices.length > 0) {
    const meaning = (softSacrifices[0].meaning ?? "").replace(/_/g, " ") || "dimension compromise";
    return isAr
      ? `نقطة ضعف: ${meaning} أقل مما أشرت إليه كأولوية.`
      : `Weakness: ${meaning} scores below your stated priority.`;
  }
  return isAr
    ? "لم تكشف بياناتنا عن نقاط ضعف بارزة — تحقق من التفاصيل التي تهمك."
    : "Our data did not surface a prominent weakness — verify the details that matter to you.";
}
