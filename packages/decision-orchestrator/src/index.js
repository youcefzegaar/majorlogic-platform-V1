import { DecisionCompiler } from "../../decision-compiler/src/index.js";
import { DecisionKernel } from "../../decision-kernel/src/index.js";
import { DecisionExplainer } from "../../decision-explanation/src/index.js";
import { createHash, randomUUID } from "node:crypto";

import { IntentEngine } from "./modules/IntentEngine.js";
import { CognitiveAnalyzer } from "./modules/CognitiveAnalyzer.js";
import { RecoveryEngine } from "./modules/RecoveryEngine.js";
import { NarrativeCache } from "./NarrativeCache.js";
import { selectCards } from "./card-selection.js";

// Stable JSON serialization: sorts keys recursively so the hash is independent of
// object key insertion order. Prevents spurious cache misses when the same profile
// arrives with different key ordering from different callers.
export function _stableStringify(val) {
  if (Array.isArray(val)) return `[${val.map(_stableStringify).join(",")}]`;
  if (val !== null && typeof val === "object") {
    const keys = Object.keys(val).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${_stableStringify(val[k])}`).join(",")}}`;
  }
  return JSON.stringify(val);
}

// Module-level singletons shared across all orchestrator instances in this process
const narrativeCache = new NarrativeCache();
export const IR_CACHE_MAX_SIZE = 50;
export function _irCacheSize() { return _irCache.size; }
const _irCache = new Map();

/**
 * Universal Decision Orchestrator
 *
 * The "brain" that sits on top of the domain-blind Kernel.
 * Driven entirely by a decision-config.json — no domain-specific JS required.
 *
 * Card selection and card building are in:
 *   - card-selection.js  (slot filling, review penalty, candidate ranking)
 *   - card-builder.js    (narrative composition, template interpolation)
 */
export class DecisionOrchestrator {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.compiler = new DecisionCompiler(this.logger);
    this.kernel = new DecisionKernel(this.logger);
    this.explainer = new DecisionExplainer(options.explainer || {});

    this.intentEngine = new IntentEngine(this.logger);
    this.cognitiveAnalyzer = new CognitiveAnalyzer(this.logger);
    this.recoveryEngine = new RecoveryEngine(this.kernel, this.logger);
  }

  async run(config, entities, userProfile) {
    this._validateInput(config, entities, userProfile);

    const ctx = {
      config,
      resolvedConfig: null,
      entities,
      userProfile,
      decisionRunId: randomUUID(),
      domainContext: null,
      mappedProfile: null,
      ir: null,
      execution: null,
      eligible: [],
      excluded: [],
      relaxedConstraint: null,
      integrityScore: 100,
      confidence: null,
      topExcludedStories: [],
      cards: [],
      governance: {},
      status: "ok",
      abort: false,
    };

    this.logger.log(`[Orchestrator] Starting decision pipeline: ${ctx.decisionRunId}`);

    const steps = [
      this._stepIntentResolution.bind(this),
      this._stepConfidenceAnalysis.bind(this),
      this._stepCompilation.bind(this),
      this._stepKernelExecution.bind(this),
      this._stepZeroResultRecovery.bind(this),
      this._stepExclusionAnalysis.bind(this),
      this._stepCardSelection.bind(this),
      this._stepGovernanceTrace.bind(this),
    ];

    for (const step of steps) {
      try {
        await step(ctx);
      } catch (err) {
        this.logger.error(`[Orchestrator] Pipeline step "${step.name}" failed:`, err);
        throw { status: "error", step: step.name, message: err.message, cause: err };
      }
      if (ctx.abort) break;
    }

    return this._formatResponse(ctx);
  }

  // ── PIPELINE STEPS ──────────────────────────────────────────────────────────

  async _stepIntentResolution(ctx) {
    const { resolvedConfig, intentContext } = this.intentEngine.resolve(ctx.config, ctx.userProfile);
    ctx.resolvedConfig = resolvedConfig;
    ctx.domainContext = {
      atlas: resolvedConfig.atlas || {},
      expertIdentity: resolvedConfig.expertIdentity || "Expert Advisor",
      locale: ctx.userProfile.locale || resolvedConfig.defaultLocale || "en",
      useAI: resolvedConfig.useAI || false,
      intent: intentContext,
    };
  }

  async _stepConfidenceAnalysis(ctx) {
    ctx.confidence = this.cognitiveAnalyzer.analyze(ctx.userProfile, ctx.resolvedConfig);
    ctx.domainContext.confidence = ctx.confidence;
  }

  async _stepCompilation(ctx) {
    ctx.mappedProfile = this._mapProfile(ctx.userProfile, ctx.resolvedConfig.profileMapping || {});
    const intentId = ctx.userProfile?.intentId || ctx.config?.defaultIntentId || "general";
    ctx.ir = this._getCompiledIR(ctx.resolvedConfig, intentId);
  }

  async _stepKernelExecution(ctx) {
    const contextArgs = { ...ctx.mappedProfile };
    ctx.execution = this.kernel.execute(ctx.ir, ctx.entities, contextArgs);
    ctx.eligible = ctx.execution.results.filter(r => r.eligible);
    ctx.excluded = ctx.execution.results.filter(r => !r.eligible);
  }

  async _stepZeroResultRecovery(ctx) {
    if (ctx.eligible.length === 0 && ctx.excluded.length > 0) {
      this.logger.log(`[Orchestrator] Zero results. Initiating Recovery Engine...`);
      const recoveryResult = await this.recoveryEngine.attemptRecovery(ctx.ir, ctx.entities, ctx.mappedProfile, ctx.excluded);
      if (recoveryResult) {
        ctx.execution = recoveryResult.execution;
        ctx.eligible  = recoveryResult.eligible;
        ctx.excluded  = recoveryResult.excluded;
        ctx.relaxedConstraint = recoveryResult.relaxedGateId;
        ctx.integrityScore    = recoveryResult.integrityScore;
        ctx.domainContext.relaxedConstraint = ctx.relaxedConstraint;
        ctx.domainContext.integrityScore    = ctx.integrityScore;
        this.logger.log(`[Orchestrator] Recovery successful by relaxing: ${ctx.relaxedConstraint}`);
      }
    }
  }

  async _stepExclusionAnalysis(ctx) {
    ctx.topExcludedStories = ctx.excluded
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(ex => {
        const title = ctx.entities.find(e => (e.entityId || e.id) === ex.entityId)?.title || ex.entityId;
        return {
          entityId: ex.entityId,
          title,
          reason: this.explainer.explainExclusion(ex.trace, title, ctx.domainContext),
        };
      });

    if (ctx.eligible.length === 0) {
      ctx.status = "no_viable_option";
      ctx.abort  = true;
    }
  }

  async _stepCardSelection(ctx) {
    if (ctx.abort) return;
    const inputHash = createHash("sha256").update(_stableStringify(ctx.userProfile)).digest("hex");
    ctx.domainContext._cacheKeys = { irHash: ctx.ir?.irHash, inputHash };

    ctx.cards = await selectCards(
      ctx.eligible,
      ctx.resolvedConfig.selectionStrategy || {},
      ctx.resolvedConfig.outputTemplate    || {},
      ctx.entities,
      ctx.resolvedConfig.taxonomy          || {},
      ctx.userProfile,
      ctx.domainContext,
      { explainer: this.explainer, narrativeCache, logger: this.logger }
    );
  }

  async _stepGovernanceTrace(ctx) {
    const inputHash = createHash("sha256").update(_stableStringify(ctx.userProfile)).digest("hex");
    ctx.governance = {
      irHash:       ctx.ir.irHash,
      inputHash,
      logicVersion: ctx.resolvedConfig.version || "1.0.0",
      tracedAt:     new Date().toISOString(),
    };
  }

  // ── RESPONSE FORMATTING ──────────────────────────────────────────────────────

  _formatResponse(ctx) {
    if (ctx.status === "no_viable_option") {
      return {
        ...this._buildNoResult(ctx.decisionRunId, ctx.ir, ctx.execution, ctx.resolvedConfig),
        topExcludedStories: ctx.topExcludedStories,
        confidence: ctx.confidence,
      };
    }
    return {
      decisionRunId:   ctx.decisionRunId,
      status:          ctx.status,
      intentId:        ctx.domainContext.intent.id,
      segment:         ctx.mappedProfile?.major || "general",
      confidence:      ctx.confidence,
      profileId:       ctx.userProfile.id || ctx.userProfile.profileId || "anonymous",
      evaluatedCount:  ctx.execution?.results?.length || 0,
      candidateCount:  ctx.eligible.length,
      excludedCount:   ctx.excluded.length,
      topExcludedStories: ctx.topExcludedStories,
      cards:           ctx.cards,
      governance:      ctx.governance,
      relaxedConstraint: ctx.relaxedConstraint,
      integrityScore:  ctx.integrityScore,
    };
  }

  _buildNoResult(decisionRunId, ir, execution, config) {
    return {
      decisionRunId,
      status:         "no_viable_option",
      evaluatedCount: execution.results.length,
      candidateCount: 0,
      excludedCount:  execution.results.length,
      cards:          [],
      governance: {
        irHash:       ir.irHash,
        logicVersion: config.version || "1.0.0",
        tracedAt:     new Date().toISOString(),
      },
    };
  }

  // ── UTILITIES ────────────────────────────────────────────────────────────────

  _validateInput(config, entities, userProfile) {
    if (!config || (!config.domainId && !config.slug)) throw new Error("Orchestrator Error: Missing domainId or slug");
    if (!Array.isArray(entities)) throw new Error("Orchestrator Error: entities must be an array");
    if (!userProfile) throw new Error("Orchestrator Error: Missing userProfile");
  }

  _getCompiledIR(config, intentId = "general") {
    const cacheKey = `${config.domainId}:${config.version ?? "0"}:${intentId}`;
    if (_irCache.has(cacheKey)) {
      const ir = _irCache.get(cacheKey);
      _irCache.delete(cacheKey);
      _irCache.set(cacheKey, ir);
      return ir;
    }
    const ir = this.compiler.compile(config);
    if (_irCache.size >= IR_CACHE_MAX_SIZE) {
      _irCache.delete(_irCache.keys().next().value);
    }
    _irCache.set(cacheKey, ir);
    return ir;
  }

  _mapProfile(rawProfile, mapping) {
    const mapped = { ...rawProfile };
    for (const [from, to] of Object.entries(mapping)) {
      if (rawProfile[from] !== undefined) {
        mapped[to] = rawProfile[from];
        if (from !== to) delete mapped[from];
      }
    }
    if (rawProfile.sliders) {
      for (const [key, val] of Object.entries(rawProfile.sliders)) {
        mapped[`slider_${key}`] = val;
      }
    }
    if (rawProfile.preferences) {
      const normalize = v => Math.max(0, Math.min(100, v ?? 50)) / 100;
      mapped.userPrefPerformance = normalize(rawProfile.preferences.performance);
      mapped.userPrefBattery     = normalize(rawProfile.preferences.battery);
      mapped.userPrefPortability = normalize(rawProfile.preferences.portability);
      mapped.userPrefDisplay     = normalize(rawProfile.preferences.display);
      mapped.userPrefResale      = normalize(rawProfile.preferences.resale);
    }
    return mapped;
  }

  getCacheStats() {
    return narrativeCache.stats();
  }
}
