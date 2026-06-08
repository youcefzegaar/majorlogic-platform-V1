import { randomInt } from "node:crypto";
import { setImmediate } from "node:timers";
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
  catalogFreshness = null,  // M13: { publishedAt, ageHours, isStale, slaHours }
  repository = null,
  domainPack = null,
  aiProvider = null   // optional: { generate(prompt) → string } — enables AI narratives
}) {
  const ruleset = decisionConfig;

  // Wire aiProvider for this specific pipeline invocation.
  // Previously mutated the singleton which caused a race condition under concurrent
  // async requests. Now we save/restore to scope the provider to this call.
  const previousAiProvider = orchestrator.explainer.aiProvider;
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
    orchestrator.explainer.aiProvider = previousAiProvider;
    return { governance };
  }


  try {
    // 2. Decision Core (Orchestrator + Kernel)
    const decision = await orchestrator.run(ruleset, publishedEntities, profile);

    // Post-process: attach structured explanation per card (M1)
    if (decision.cards?.length > 0) {
      const locale = profile.locale ?? 'en';
      decision.cards.forEach((card, idx) => {
        // BUG-03 fix: use the next card in ranked order as the runner-up,
        // falling back to the previous one. Previously used .find(i !== idx)
        // which always returned card[0] for every non-hero card.
        const runnerUpCard = decision.cards[idx + 1] ?? decision.cards[idx - 1] ?? null;
        card.explanation = orchestrator.explainer.buildExplanation(
          card.trace ?? {},
          profile,
          runnerUpCard ? { title: runnerUpCard.title, score: runnerUpCard.score } : null,
          locale,
          card.score  // BUG-02 fix: pass heroScore so margin is computed correctly
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

    // G.5: Determinism probe — compute for 5% of requests BEFORE the certificate so
    // the result can be included in the integrity certificate (guard 5).
    // Store asynchronously (fire-and-forget) to never block the user.
    let determinismProbe = { sampled: false };
    if (repository && decision.decisionRunId && randomInt(0, 100) < 5) {
      const topCard = decision.cards?.[0] ?? null;
      const irHash = topCard?.irHash ?? null;
      determinismProbe = { sampled: true, irHashPresent: irHash != null, irHash };
      setImmediate(async () => {
        try {
          await repository.saveDeterminismProbe({
            domainId: ruleset.domainId,
            decisionRunId: decision.decisionRunId,
            irHash,
            topCardEntityId: topCard?.entityId ?? null,
            topCardScore: topCard?.score ?? null,
          });
        } catch { /* non-fatal */ }
      });
    }

    // G.6: Integrity certificate — runs after commercial routes so bestOffer.isAffiliate is populated.
    // Includes determinismProbe result from G.5 (sampled: false for the other 95%).
    let integrityCertificate = null;
    try {
      const { runAll } = await import("../../governance-evaluator/src/index.js");
      const evalCtx = {
        governance,
        catalogTruth: { total: publishedEntities.length },
        determinismProbe,
      };
      integrityCertificate = runAll(decision, null, evalCtx);
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

      // B. Save the integrity certificate (must happen after saveDecisionRun due to FK constraint)
      if (integrityCertificate && integrityCertificate.decisionRunId) {
        try {
          await repository.saveCertificate({
            decisionRunId: integrityCertificate.decisionRunId,
            overallPassed: integrityCertificate.overallPassed,
            integrityScore: integrityCertificate.integrityScore,
            guardsMap: integrityCertificate.guardsMap,
          });
        } catch { /* non-fatal */ }
      }

      // C. Marketing & Distribution artifacts
      await repository.saveGrowthArtifacts({
        domainId: ruleset.domainId,
        growth
      });

      // D. Recovery Engine Interventions (Traceability)
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
      schemaVersion: 2,
      domain: { domainId: ruleset.domainId },
      governance,
      decision,
      commercialRoutes,
      ownership,
      trust,
      growth,
      integrityCertificate,
      catalogFreshness,
    };
  } finally {
    // PROD-02 fix: always restore the previous aiProvider to avoid leaking
    // one request's provider into subsequent requests.
    orchestrator.explainer.aiProvider = previousAiProvider;
  }
}
