import { PublishedCatalog } from "../../published-catalog/src/index.js";
import { runDecisionEngine } from "../../decision-engine/src/index.js";
import { DecisionOrchestrator } from "../../decision-orchestrator/src/index.js";
import { buildOwnershipStrategy } from "../../ownership-strategy/src/index.js";
import { auditDecision } from "../../trust-integrity/src/index.js";
import { buildGrowthArtifacts } from "../../growth-distribution/src/index.js";
import { enforceGovernance } from "../../strategic-governance/src/index.js";
import { attachCommercialRoutes } from "../../commercial-routing/src/index.js";

const orchestrator = new DecisionOrchestrator();

/**
 * Universal Pipeline — The new path that uses the declarative Orchestrator.
 */
export async function executeUniversalPipeline({
  profile,
  decisionConfig,
  publishedEntities,
  catalogVersion = null,
  publishRunId = null,
  repository = null,
  domainPack = null // Optional for backward compatibility in some layers
}) {
  // 1. Run Orchestrator
  const decision = orchestrator.run(decisionConfig, publishedEntities, profile);

  const catalog = new PublishedCatalog({
    entities: publishedEntities,
    domainPack: domainPack || { meta: { domainId: decisionConfig.domainId } }
  });

  // 2. Wrap decision into the expected format if needed
  // Note: DecisionOrchestrator already returns a structure compatible with the engine

  // 3. Downstream layers
  const commercialRoutes = attachCommercialRoutes({
    decision,
    catalog,
    domainPack
  });

  const ownership = buildOwnershipStrategy({
    profile,
    catalog,
    decision,
    domainPack
  });

  const trust = auditDecision({
    catalog,
    decision,
    domainPack
  });

  const growth = buildGrowthArtifacts({
    profile,
    decision,
    domainPack
  });

  if (repository) {
    await repository.saveDecisionRun({
      domainId: decisionConfig.domainId,
      profile,
      ruleset: decisionConfig,
      decision,
      ownership,
      trust,
      catalogVersion,
      publishRunId
    });
  }

  return {
    domain: { domainId: decisionConfig.domainId },
    decision,
    commercialRoutes,
    ownership,
    trust,
    growth
  };
}

export async function executePlatformPipeline({
  profile,
  domainPack,
  publishedEntities,
  catalogVersion = null,
  publishRunId = null,
  ruleset,
  repository = null
}) {
  const governance = enforceGovernance({ profile, ruleset, domainPack });
  if (repository) {
    await repository.saveGuardrailEvents({
      domainId: domainPack.meta.domainId,
      governance
    });
  }

  if (!governance.ok) {
    return { governance };
  }

  const catalog = new PublishedCatalog({
    entities: publishedEntities,
    domainPack
  });

  const decision = await runDecisionEngine({
    profile,
    catalog,
    ruleset,
    domainPack
  });

  const commercialRoutes = attachCommercialRoutes({
    decision,
    catalog,
    domainPack
  });

  const ownership = buildOwnershipStrategy({
    profile,
    catalog,
    decision,
    domainPack
  });

  const trust = auditDecision({
    catalog,
    decision,
    domainPack
  });

  const growth = buildGrowthArtifacts({
    profile,
    decision,
    domainPack
  });

  if (repository) {
    await repository.saveDecisionRun({
      domainId: domainPack.meta.domainId,
      profile,
      ruleset,
      decision,
      ownership,
      trust,
      catalogVersion,
      publishRunId
    });

    await repository.saveGrowthArtifacts({
      domainId: domainPack.meta.domainId,
      growth
    });
  }

  return {
    domain: domainPack.meta,
    governance,
    decision,
    commercialRoutes,
    ownership,
    trust,
    growth
  };
}
