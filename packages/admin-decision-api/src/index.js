import { getRepository } from "../../../apps/api/src/db/repository.js";
import { DecisionOrchestrator } from "../../decision-orchestrator/src/index.js";

/**
 * Decision Forensic SDK - Cognitive Control Plane V2
 * مسؤول عن إعادة تمثيل القرارات تاريخياً وتحليل نزاهتها.
 */
export async function replayDecision(decisionUUID) {
  const repository = await getRepository();
  if (!repository) throw new Error("Persistence layer offline");

  // 1. جلب بيانات القرار التاريخي من Telemetry
  const run = await repository.getDecisionTrace(decisionUUID);
  if (!run) throw new Error("Decision run not found in forensic ledger");

  const { payload_json, domain_id } = run;
  const { profile, ruleset } = payload_json;

  // 2. استدعاء المحرك لإعادة التمثيل (Replay)
  // ملاحظة: نستخدم الـ ruleset التاريخي المخزن مع القرار لضمان الدقة
  const orchestrator = new DecisionOrchestrator({ logger: { log: () => {} } });
  
  // نحتاج إلى جلب الكتالوج كما كان في وقت القرار (إذا كان مدعوماً، حالياً نستخدم الأحدث)
  const entities = await repository.getPublishedEntities({ domainId: domain_id });

  const trace = await orchestrator.run(ruleset, entities, profile);

  return {
    decision_id: run.id,
    timestamp: run.created_at,
    execution_trace: trace,
    integrity_score: trace.integrityScore ?? 100,
    status: trace.status
  };
}

/**
 * رصد الانحراف التجاري (Commercial Drift)
 */
export function calculateCommercialDrift(decision) {
  if (!decision.cards || decision.cards.length === 0) return 0;
  
  // حساب الارتباط بين الترتيب (Rank) والعمولة (Commission)
  // كود أولي للرصد الأخلاقي
  const drift = decision.cards.reduce((acc, card) => {
    return acc + (card.commercialRoutes?.commissionLevel || 0);
  }, 0) / decision.cards.length;


/**
 * Shadow Runner: محاكاة أثر تعديل القواعد على البيانات التاريخية
 */
export async function simulateImpact(domainId, modifications, sampleSize = 100) {
  const repository = await getRepository();
  const orchestrator = new DecisionOrchestrator({ logger: { log: () => {} } });

  // 1. جلب عينة من القرارات التاريخية
  const recentRuns = await repository.pool.query(
    `SELECT payload_json FROM ml_telemetry.decision_runs 
     WHERE domain_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [domainId, sampleSize]
  );

  const results = {
    total_simulated: recentRuns.rows.length,
    impact_metrics: {
      zero_result_delta: 0,
      avg_integrity_delta: 0,
      users_affected: 0
    },
    risk_alerts: []
  };

  if (results.total_simulated === 0) return results;

  let totalOldIntegrity = 0;
  let totalNewIntegrity = 0;
  let oldZeroCount = 0;
  let newZeroCount = 0;

  for (const row of recentRuns.rows) {
    const { profile, ruleset } = row.payload_json;

    // تطبيق التعديلات المقترحة على الـ ruleset
    const modifiedRuleset = { 
      ...ruleset, 
      gates: { ...ruleset.gates }
    };
    
    for (const [gateId, weight] of Object.entries(modifications)) {
      if (modifiedRuleset.gates[gateId]) {
        modifiedRuleset.gates[gateId].weight = weight;
      }
    }

    // تشغيل المحاكاة (الكتالوج حالياً ثابت للتجربة)
    const entities = await repository.getPublishedEntities({ domainId });
    const originalResult = row.payload_json.decision;
    const simulatedResult = await orchestrator.run(modifiedRuleset, entities, profile);

    // حساب الفروقات
    totalOldIntegrity += originalResult.integrityScore ?? 100;
    totalNewIntegrity += simulatedResult.integrityScore ?? 100;

    if (originalResult.candidateCount === 0) oldZeroCount++;
    if (simulatedResult.candidateCount === 0) newZeroCount++;

    if (originalResult.cards?.[0]?.entityId !== simulatedResult.cards?.[0]?.entityId) {
      results.impact_metrics.users_affected++;
    }
  }

  results.impact_metrics.avg_integrity_delta = (totalNewIntegrity - totalOldIntegrity) / results.total_simulated;
  results.impact_metrics.zero_result_delta = ((newZeroCount - oldZeroCount) / results.total_simulated) * 100;

  // رصد المخاطر
  if (results.impact_metrics.zero_result_delta > 5) {
    results.risk_alerts.push(`⚠️ تحذير: هذا التعديل سيزيد من حالات 'صفر نتائج' بنسبة ${results.impact_metrics.zero_result_delta.toFixed(1)}%`);
  }

  return results;
}
