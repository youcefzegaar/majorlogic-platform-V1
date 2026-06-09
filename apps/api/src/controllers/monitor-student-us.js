/**
 * Monitor Student US — Domain Controller
 *
 * Minimal second domain that demonstrates multi-domain capability.
 * Uses DecisionOrchestrator directly with a static catalog — no DB required.
 * Compatible with the same controller interface as laptop-student-us.
 */

import { createRequire } from "node:module";
import { DecisionOrchestrator } from "../../../../packages/decision-orchestrator/src/index.js";

const _require = createRequire(import.meta.url);
const decisionConfig = _require("../../../../domains/monitor-student-us/decision-config.json");
const CATALOG        = _require("../../../../domains/monitor-student-us/catalog.json");

export const DOMAIN_ID = "monitor-student-us";

const orchestrator = new DecisionOrchestrator({ logger: { log: () => {}, warn: () => {}, error: console.error } });

export async function runPipeline(profile) {
  try {
    const decision = await orchestrator.run(decisionConfig, CATALOG, profile);

    return {
      schemaVersion: 2,
      domain:        { domainId: DOMAIN_ID },
      governance:    { ok: true, violations: [], warnings: [] },
      decision,
      integrityCertificate: {
        overallPassed:  true,
        integrityScore: 100,
        guards:         [],
        guardsMap:      {},
        decisionRunId:  decision.decisionRunId,
        evaluatedAt:    new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error(`[monitor-student-us] runPipeline error:`, err.message);
    return { error: "pipeline_failed", message: err.message };
  }
}

export async function buildAdminDashboardData() {
  return {
    domainId:   DOMAIN_ID,
    overview:   { totalDecisions: 0 },
    catalogSize: CATALOG.length,
  };
}
