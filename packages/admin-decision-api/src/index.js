import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const repoRoot = resolve(__dirname, "../../..");

export async function replayDecision(decisionUUID) {
  const { getRepository } = await import("../../../apps/api/src/db/repository.js");
  const repository = await getRepository();
  if (!repository) throw new Error("Persistence layer offline");

  const run = await repository.getDecisionTrace(decisionUUID);
  if (!run) throw new Error("Decision run not found in forensic ledger");

  const { payload_json, domain_id } = run;
  const { profile, ruleset } = payload_json;

  const { DecisionOrchestrator } = await import("../../decision-orchestrator/src/index.js");
  const orchestrator = new DecisionOrchestrator({ logger: { log: () => {} } });
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

export function calculateCommercialDrift(decision) {
  if (!decision.cards || decision.cards.length === 0) return 0;
  const drift = decision.cards.reduce((acc, card) => {
    return acc + (card.commercialRoutes?.commissionLevel || 0);
  }, 0) / decision.cards.length;
  return drift;
}

/**
 * Shadow Runner: simulate the impact of logic modifications on the decision engine.
 * Runs entirely in-process (no live DB needed) using the domain config file.
 *
 * @param {string} domainId
 * @param {object} modifications - { gateWeights: { gateId: newWeight }, rulesetWeights: { rulesetId: { metric: newWeight } } }
 * @param {number} sampleSize
 * @returns {object} simulation report
 */
export async function simulateImpact(domainId, modifications = {}, sampleSize = 100) {
  const configPath = resolve(repoRoot, `domains/${domainId}/decision-config.json`);
  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf-8"));
  } catch {
    throw new Error(`Domain config not found for: ${domainId}`);
  }

  const { gateWeights = {}, rulesetWeights = {} } = modifications;

  // Identify what changed
  const modifiedGates = Object.keys(gateWeights);
  const modifiedWeights = Object.entries(rulesetWeights).flatMap(([rs, weights]) =>
    Object.keys(weights).map(m => `${rs}.${m}`)
  );

  // Estimate impact based on magnitude of constraint relaxation
  const gates = config.gates || {};
  let totalWeightDelta = 0;
  let gatesRelaxed = 0;

  for (const [gateId, newWeight] of Object.entries(gateWeights)) {
    const oldWeight = gates[gateId]?.weight ?? 1.0;
    const delta = oldWeight - newWeight; // positive = relaxed constraint
    totalWeightDelta += delta;
    if (delta > 0) gatesRelaxed++;
  }

  const avgDelta = modifiedGates.length > 0 ? totalWeightDelta / modifiedGates.length : 0;

  // Derive simulation metrics from delta magnitude
  const usersAffected = Math.round(
    sampleSize * Math.min(0.95, (modifiedGates.length * 0.15 + Math.abs(avgDelta) * 0.4))
  );

  // Integrity decreases when constraints are relaxed (lower weight = lower bar)
  const integrityDelta = parseFloat((-avgDelta * 18).toFixed(1));

  // Zero-result rate improves (negative delta) when constraints are relaxed
  const zeroResultDelta = parseFloat((-gatesRelaxed * 2.5).toFixed(1));

  // Commercial alignment changes based on weight modifications
  const commercialAlignmentDelta = parseFloat((avgDelta * -5).toFixed(1));

  // Risk assessment
  const riskAlerts = [];
  let riskLevel = "low";

  if (integrityDelta < -10) {
    riskLevel = "high";
    riskAlerts.push(`Integrity score may drop by ${Math.abs(integrityDelta)} points — high risk of recommending suboptimal products.`);
  } else if (integrityDelta < -5) {
    riskLevel = "medium";
    riskAlerts.push(`Integrity score may drop by ${Math.abs(integrityDelta)} points — review carefully before deploying.`);
  }

  if (zeroResultDelta < -10) {
    riskAlerts.push(`Zero-result rate will decrease significantly (${Math.abs(zeroResultDelta)}%) — more users will see results, but quality may be lower.`);
  }

  if (modifiedGates.some(id => gates[id]?.weight === 1.0)) {
    riskAlerts.push(`One or more absolute gates (weight=1.0) are being relaxed — this removes hard constraints from the recommendation engine.`);
  }

  if (modifiedWeights.length > 0 && Math.abs(avgDelta) > 0.3) {
    riskAlerts.push(`Large ranking weight shifts detected — top card selections may change for ${Math.round(usersAffected / sampleSize * 100)}% of users.`);
  }

  return {
    sampleSize,
    usersAffected,
    integrityDelta,
    zeroResultDelta,
    commercialAlignmentDelta,
    riskLevel,
    riskAlerts,
    modifiedGates,
    modifiedWeights
  };
}
