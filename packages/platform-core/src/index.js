import { PublishedCatalog } from "../../published-catalog/src/index.js";
import { runDecisionEngine } from "../../decision-engine/src/index.js";
import { buildOwnershipStrategy } from "../../ownership-strategy/src/index.js";
import { auditDecision } from "../../trust-integrity/src/index.js";
import { buildGrowthArtifacts } from "../../growth-distribution/src/index.js";
import { enforceGovernance } from "../../strategic-governance/src/index.js";
import { attachCommercialRoutes } from "../../commercial-routing/src/index.js";

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

  const decision = runDecisionEngine({
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
