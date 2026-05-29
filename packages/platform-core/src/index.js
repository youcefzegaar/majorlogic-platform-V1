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
  domainPack = null,
  aiProvider = null   // optional: { generate(prompt) → string } — enables AI narratives
}) {
  const ruleset = decisionConfig;

  // Wire aiProvider into the singleton orchestrator's explainer for this request.
  // Node.js is single-threaded so this is safe — no concurrent mutation risk.
  orchestrator.explainer.aiProvider = aiProvider ?? null;

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

  // Post-process: attach structured explanation per card (M1)
  if (decision.cards?.length > 0) {
    const locale = profile.locale ?? 'en';
    decision.cards.forEach((card, idx) => {
      const runnerUp = decision.cards.find((c, i) => i !== idx) ?? null;
      card.explanation = orchestrator.explainer.buildExplanation(
        card.trace ?? {},
        profile,
        runnerUp ? { title: runnerUp.title, score: runnerUp.score } : null,
        locale
      );
    });
  }

  const catalog = new PublishedCatalog({
    entities: publishedEntities,
    domainPack: domainPack || { meta: { domainId: ruleset.domainId } }
  });

  // 3. Post-Decision Value Layers
  // ownership must run before commercialRoutes — it provides ownershipStrategies
  // for per-card trust filtering. Previously these were independent; now sequential.
  const ownership = buildOwnershipStrategy({ profile, catalog, decision, domainPack });
  const commercialRoutes = attachCommercialRoutes({
    decision, catalog, domainPack,
    ownershipStrategies: ownership.strategies
  });
  const trust = auditDecision({ catalog, decision, domainPack });
  const growth = buildGrowthArtifacts({ profile, decision, domainPack });

  // G.6: Integrity certificate — runs after commercial routes so bestOffer.isAffiliate is populated
  let integrityCertificate = null;
  try {
    const { runAll } = await import("../../governance-evaluator/src/index.js");
    const evalCtx = {
      governance,
      catalogTruth: { total: publishedEntities.length },
    };
    integrityCertificate = runAll(decision, null, evalCtx);
    if (repository && integrityCertificate.decisionRunId) {
      await repository.saveCertificate({
        decisionRunId: integrityCertificate.decisionRunId,
        overallPassed: integrityCertificate.overallPassed,
        integrityScore: integrityCertificate.integrityScore,
        guardsMap: integrityCertificate.guardsMap,
      });
    }
  } catch { /* governance evaluation must never block a decision */ }

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

    // G.5: Determinism probe — 5% sampling, fire-and-forget, never blocks user
    if (decision.decisionRunId && Math.random() < 0.05) {
      setImmediate(async () => {
        try {
          const topCard = decision.cards?.[0] ?? null;
          await repository.saveDeterminismProbe({
            domainId: ruleset.domainId,
            decisionRunId: decision.decisionRunId,
            irHash: topCard?.irHash ?? null,
            topCardEntityId: topCard?.entityId ?? null,
            topCardScore: topCard?.score ?? null,
          });
        } catch { /* non-fatal — never interrupt user decision */ }
      });
    }
  }

  return {
    schemaVersion: 2,
    domain: { domainId: ruleset.domainId },
    governance,
    decision,
    commercialRoutes,
    ownership,
    trust,
    growth,
    integrityCertificate,
  };
}
