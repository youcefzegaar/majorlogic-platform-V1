/**
 * strategic-governance — Layer 9: Strategic Integrity & Governance
 *
 * الغرض: وضع القيود الدستورية ومعايير الاعتماد.
 * يمنع التوسع غير المدروس ويحمي أولوية "الحياد قبل الإيراد".
 *
 * مبدأ: لا يُطلق دومين جديد إلا بعد اجتياز بوابات النضج (Maturity Gates).
 */

/**
 * قائمة الدومينات المعتمدة للتشغيل.
 * كل دومين جديد يجب إضافته هنا بعد اجتياز بوابات النضج.
 */
const APPROVED_DOMAINS = new Set([
  "laptop-student-us"
]);

/**
 * بوابات النضج المطلوبة لإضافة دومين جديد.
 */
const MATURITY_GATES = [
  "feasibility_knowledge",       // هل توجد بيانات كافية لبناء كتالوج؟
  "feasibility_decision",        // هل يوجد ruleset قابل للتطبيق؟
  "feasibility_ownership",       // هل يمكن تقديم نصيحة ملكية حقيقية؟
  "commercial_integrity_check"   // هل يمكن فصل الإيراد عن القرار؟
];

export function enforceGovernance({ profile, ruleset, domainPack }) {
  const violations = [];
  const warnings   = [];
  const domainId   = domainPack?.meta?.domainId;

  // ─── فحص الهيكلية الأساسية ──────────────────────────────────
  if (!domainId) {
    violations.push("Platform drift: execution requires an explicit domain pack with domainId.");
  }

  if (!ruleset?.logicVersion) {
    violations.push("Missing ruleset version: every execution must reference a versioned ruleset.");
  }

  // ─── فحص نطاق السوق ─────────────────────────────────────────
  if (ruleset?.scope?.market && ruleset.scope.market !== "US") {
    violations.push(`Scope drift: market '${ruleset.scope.market}' is not approved in v1. Only 'US' is supported.`);
  }

  // ─── فحص اعتماد الدومين ──────────────────────────────────────
  if (domainId && !APPROVED_DOMAINS.has(domainId)) {
    violations.push(
      `Expansion drift: domain '${domainId}' is not in the approved registry. ` +
      `Required maturity gates: ${MATURITY_GATES.join(", ")}.`
    );
  }

  // ─── فحص التخصصات المدعومة ───────────────────────────────────
  const segmentKey = domainPack?.meta?.segmentKey;
  if (segmentKey && profile[segmentKey]) {
    const segment = profile[segmentKey];
    const supportedSegments = Object.keys(ruleset?.weightsByMajor ?? {});

    if (supportedSegments.length > 0 && !supportedSegments.includes(segment)) {
      warnings.push(
        `Segment '${segment}' is not in the ruleset. Falling back to 'general'. ` +
        `Supported: ${supportedSegments.join(", ")}.`
      );
    }
  }

  // ─── فحص سلامة سياسات الشفافية ────────────────────────────────
  if (ruleset?.policies) {
    if (ruleset.policies.requireBadNews !== true) {
      warnings.push("Transparency warning: 'requireBadNews' policy is not enforced.");
    }
    if (ruleset.policies.budgetMustHold !== true) {
      warnings.push("Budget warning: 'budgetMustHold' policy is not enforced.");
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    warnings,
    domainId: domainId ?? "unknown",
    approvedDomains: [...APPROVED_DOMAINS],
    maturityGates: MATURITY_GATES
  };
}
