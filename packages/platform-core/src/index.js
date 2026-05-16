import { PublishedCatalog } from "../../published-catalog/src/index.js";
import { DecisionOrchestrator } from "../../decision-orchestrator/src/index.js";
import { buildOwnershipStrategy } from "../../ownership-strategy/src/index.js";
import { auditDecision } from "../../trust-integrity/src/index.js";
import { buildGrowthArtifacts } from "../../growth-distribution/src/index.js";
import { enforceGovernance } from "../../strategic-governance/src/index.js";
import { attachCommercialRoutes } from "../../commercial-routing/src/index.js";

const orchestrator = new DecisionOrchestrator();

/**
 * Universal Pipeline — The unified path for decision execution.
 * Integrates the declarative Orchestrator with legacy domain-pack logic
 * and advanced persistence (telemetry, interventions, governance).
 */
export async function executeUniversalPipeline({
  profile,
  decisionConfig,
  publishedEntities,
  catalogVersion = null,
  publishRunId = null,
  repository = null,
  domainPack = null
}) {
  const ruleset = decisionConfig;

  // 1. Strategic Governance Check (if domainPack is provided)
  let governance = { ok: true };
  if (domainPack) {
    governance = enforceGovernance({ profile, ruleset, domainPack });
    if (repository && !governance.ok) {
      await repository.saveGuardrailEvents({
        domainId: ruleset.domainId,
        governance
      });
    }
  }

  if (!governance.ok) {
    return { governance };
  }

  // 2. Decision Core (Orchestrator + Kernel)
  const decision = await orchestrator.run(ruleset, publishedEntities, profile);

  const catalog = new PublishedCatalog({
    entities: publishedEntities,
    domainPack: domainPack || { meta: { domainId: ruleset.domainId } }
  });

  // 3. Post-Decision Value Layers
  const commercialRoutes = attachCommercialRoutes({ decision, catalog, domainPack });
  const ownership = buildOwnershipStrategy({ profile, catalog, decision, domainPack });
  const trust = auditDecision({ catalog, decision, domainPack });
  const growth = buildGrowthArtifacts({ profile, decision, domainPack });

  // 4. Industrial Persistence
  if (repository) {
    // A. Main decision run ledger
    await repository.saveDecisionRun({
      domainId: ruleset.domainId,
      profile,
      ruleset,
      decision,
      ownership,
      trust,
      catalogVersion,
      publishRunId
    });

    // B. Marketing & Distribution artifacts
    await repository.saveGrowthArtifacts({
      domainId: ruleset.domainId,
      growth
    });

    // C. Recovery Engine Interventions (Traceability)
    if (decision.relaxedConstraint) {
      await repository.saveIntervention({
        decisionRunId: decision.decisionRunId,
        domainId: ruleset.domainId,
        relaxedConstraint: decision.relaxedConstraint,
        integrityScore: decision.integrityScore,
        originalExcludedCount: decision.excludedCount,
        recoveredCount: decision.candidateCount
      });
    }
  }

  return {
    domain: { domainId: ruleset.domainId },
    governance,
    decision,
    commercialRoutes,
    ownership,
    trust,
    growth
  };
}
