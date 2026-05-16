import { DecisionCompiler } from "../../decision-compiler/src/index.js";
import { DecisionKernel } from "../../decision-kernel/src/index.js";
import { DecisionExplainer } from "../../decision-explanation/src/index.js";
import { produceReviewIntelligence } from "../../catalog-review-intelligence/src/index.js";
import { createHash, randomUUID } from "node:crypto";

import { IntentEngine } from "./modules/IntentEngine.js";
import { CognitiveAnalyzer } from "./modules/CognitiveAnalyzer.js";
import { RecoveryEngine } from "./modules/RecoveryEngine.js";

/**
 * Universal Decision Orchestrator
 * 
 * The "brain" that sits on top of the domain-blind Kernel.
 * Driven entirely by a decision-config.json — no domain-specific JS required.
 */
export class DecisionOrchestrator {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.compiler = new DecisionCompiler(this.logger);
    this.kernel = new DecisionKernel(this.logger);
    this.explainer = new DecisionExplainer(options.explainer || {});
    this.irCache = new Map(); // Performance: Cache compiled IRs

    // Cognitive Sub-Modules
    this.intentEngine = new IntentEngine(this.logger);
    this.cognitiveAnalyzer = new CognitiveAnalyzer(this.logger);
    this.recoveryEngine = new RecoveryEngine(this.kernel, this.logger);
  }

  /**
   * Execute a full decision pipeline from config + data.
   */
  async run(config, entities, userProfile) {
    this._validateInput(config, entities, userProfile);
    
    // Shared Pipeline Context
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
      integrityScore: 100, // Starts at 100% integrity
      confidence: null,
      topExcludedStories: [],
      cards: [],
      governance: {},
      status: "ok",
      abort: false
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
        this._stepGovernanceTrace.bind(this)
    ];

    for (const step of steps) {
        await step(ctx);
        if (ctx.abort) break;
    }

    return this._formatResponse(ctx);
  }

  // ── PIPELINE STEPS ──

  async _stepIntentResolution(ctx) {
      const { resolvedConfig, intentContext } = this.intentEngine.resolve(ctx.config, ctx.userProfile);
      ctx.resolvedConfig = resolvedConfig;
      ctx.domainContext = {
          atlas: resolvedConfig.atlas || {},
          expertIdentity: resolvedConfig.expertIdentity || "Expert Advisor",
          locale: ctx.userProfile.locale || resolvedConfig.defaultLocale || "en",
          useAI: resolvedConfig.useAI || false,
          intent: intentContext
      };
  }

  async _stepConfidenceAnalysis(ctx) {
      ctx.confidence = this.cognitiveAnalyzer.analyze(ctx.userProfile, ctx.resolvedConfig);
      ctx.domainContext.confidence = ctx.confidence;
  }

  async _stepCompilation(ctx) {
      ctx.mappedProfile = this._mapProfile(ctx.userProfile, ctx.resolvedConfig.profileMapping || {});
      ctx.ir = this._getCompiledIR(ctx.resolvedConfig);
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
          const recoveryResult = this.recoveryEngine.attemptRecovery(ctx.ir, ctx.entities, ctx.mappedProfile, ctx.excluded);
          if (recoveryResult) {
              ctx.execution = recoveryResult.execution;
              ctx.eligible = recoveryResult.eligible;
              ctx.excluded = recoveryResult.excluded;
              ctx.relaxedConstraint = recoveryResult.relaxedGateId;
              ctx.integrityScore = recoveryResult.integrityScore;
              ctx.domainContext.relaxedConstraint = ctx.relaxedConstraint;
              ctx.domainContext.integrityScore = ctx.integrityScore;
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
                  reason: this.explainer.explainExclusion(ex.trace, title, ctx.domainContext)
              };
          });

      if (ctx.eligible.length === 0) {
          ctx.status = "no_viable_option";
          ctx.abort = true;
      }
  }

  async _stepCardSelection(ctx) {
      if (ctx.abort) return;
      ctx.cards = await this._selectCards(
          ctx.eligible, 
          ctx.resolvedConfig.selectionStrategy || {}, 
          ctx.resolvedConfig.outputTemplate || {}, 
          ctx.entities, 
          ctx.resolvedConfig.taxonomy || {}, 
          ctx.userProfile, 
          ctx.domainContext
      );
  }

  async _stepGovernanceTrace(ctx) {
      const inputHash = createHash("sha256").update(JSON.stringify(ctx.userProfile)).digest("hex");
      ctx.governance = {
          irHash: ctx.ir.irHash,
          inputHash,
          logicVersion: ctx.resolvedConfig.version || "1.0.0",
          tracedAt: new Date().toISOString()
      };
  }

  _formatResponse(ctx) {
      if (ctx.status === "no_viable_option") {
          return {
              ...this._buildNoResult(ctx.decisionRunId, ctx.ir, ctx.execution, ctx.resolvedConfig),
              topExcludedStories: ctx.topExcludedStories,
              confidence: ctx.confidence
          };
      }

      return {
          decisionRunId: ctx.decisionRunId,
          status: ctx.status,
          intentId: ctx.domainContext.intent.id,
          segment: ctx.mappedProfile?.major || "general",
          confidence: ctx.confidence,
          profileId: ctx.userProfile.id || ctx.userProfile.profileId || "anonymous",
          evaluatedCount: ctx.execution?.results?.length || 0,
          candidateCount: ctx.eligible.length,
          excludedCount: ctx.excluded.length,
          topExcludedStories: ctx.topExcludedStories,
          cards: ctx.cards,
          governance: ctx.governance,
          relaxedConstraint: ctx.relaxedConstraint,
          integrityScore: ctx.integrityScore
      };
  }


  _validateInput(config, entities, userProfile) {
    if (!config || (!config.domainId && !config.slug)) throw new Error("Orchestrator Error: Missing domainId or slug");
    if (!Array.isArray(entities)) throw new Error("Orchestrator Error: entities must be an array");
    if (!userProfile) throw new Error("Orchestrator Error: Missing userProfile");
  }

  _getCompiledIR(config) {
    const configHash = createHash("md5").update(JSON.stringify(config)).digest("hex");
    if (this.irCache.has(configHash)) {
      return this.irCache.get(configHash);
    }
    const ir = this.compiler.compile(config);
    this.irCache.set(configHash, ir);
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
    
    // Always include sliders if they exist
    if (rawProfile.sliders) {
      for (const [key, val] of Object.entries(rawProfile.sliders)) {
        mapped[`slider_${key}`] = val;
      }
    }

    // Fix: Normalize and flatten preferences for userPreferenceScore calculation in Kernel
    if (rawProfile.preferences) {
      const normalize = v => 0.5 + 0.5 * (v / 100);
      mapped.userPrefPerformance  = normalize(rawProfile.preferences.performance ?? 50);
      mapped.userPrefBattery      = normalize(rawProfile.preferences.battery      ?? 50);
      mapped.userPrefPortability  = normalize(rawProfile.preferences.portability  ?? 50);
      mapped.userPrefDisplay      = normalize(rawProfile.preferences.display      ?? 50);
      mapped.userPrefResale       = normalize(rawProfile.preferences.resale       ?? 50);
    }
    
    return mapped;
  }

  async _selectCards(eligible, strategy, outputTemplate, rawEntities, taxonomy, userProfile, domainContext) {
    const slots = strategy.cardSlots || [{ type: "hero", pickBy: "highest_score" }];
    const noDuplicates = strategy.noDuplicates !== false;
    const selectedIds = new Set();
    const cards = [];

    const entityLookup = new Map();
    for (const e of rawEntities) {
      entityLookup.set(e.entityId || e.id, e);
    }

    for (const slot of slots) {
      let candidates = noDuplicates
        ? eligible.filter(r => !selectedIds.has(r.entityId))
        : [...eligible];

      if (candidates.length === 0) continue;

      const picked = this._pickCandidate(candidates, slot, entityLookup);
      if (!picked) continue;

      selectedIds.add(picked.entityId);

      const rawEntity = entityLookup.get(picked.entityId) || {};
      
      // Integrate Review Intelligence Signals
      const intelligence = produceReviewIntelligence({
        topCons: rawEntity.topCons || [],
        reviewRiskScore: rawEntity.market?.reviewRiskScore || 0,
        taxonomy,
        reviewCount: rawEntity.market?.reviewCount || 0
      });

      const card = await this._buildCard(slot.type, picked, rawEntity, outputTemplate, intelligence, userProfile, domainContext);
      cards.push(card);
    }

    return cards;
  }

  _pickCandidate(candidates, slot, entityLookup) {
    const priceField = slot.priceField || "price";
    const getPrice = (r) => {
      const raw = entityLookup.get(r.entityId) || {};
      return raw[priceField] || raw.market?.bestOffer?.priceUsd || Infinity;
    };

    // Enforce minScore quality gate if defined in slot config.
    // Prevents low-quality cards from filling slots (e.g. future_proof with score 52).
    const minScore = slot.minScore ?? 0;
    const qualified = minScore > 0
      ? candidates.filter(r => r.score >= minScore)
      : candidates;

    // If no candidates meet the quality bar, log and return null (slot stays empty).
    if (qualified.length === 0) {
      this.logger.log(`[Orchestrator] Slot "${slot.type}" skipped: no candidates meet minScore=${minScore}`);
      return null;
    }

    switch (slot.pickBy) {
      case "highest_score":
        return qualified.sort((a, b) => b.score - a.score)[0];
      case "lowest_price":
        return qualified.sort((a, b) => getPrice(a) - getPrice(b))[0];
      case "best_ratio": {
        return qualified.sort((a, b) => {
          const ratioA = a.score / Math.max(getPrice(a), 1);
          const ratioB = b.score / Math.max(getPrice(b), 1);
          return ratioB - ratioA;
        })[0];
      }
      default:
        return qualified[0];
    }
  }

  async _buildCard(cardType, kernelResult, rawEntity, template, intelligence, userProfile, domainContext) {
    const card = {
      cardType,
      entityId: kernelResult.entityId,
      score: Math.round(kernelResult.score * 100) / 100,
      eligible: kernelResult.eligible,
      intelligence, // Full review intelligence payload
      trace: kernelResult.trace,
      sacrifices: kernelResult.trace.sacrifices || {} // The Sacrifice Vector (Constitution v1.0)
    };

    const story = await this.explainer.explain(kernelResult.trace, rawEntity.title || rawEntity.itemName || kernelResult.entityId, domainContext);
    const tradeoff = this.explainer.explainTradeoff(kernelResult.trace, domainContext.atlas, domainContext.locale) || intelligence.primaryWarning;

    const context = {
      entity: rawEntity,
      score: kernelResult.score,
      scores: kernelResult.trace.scores,
      entityId: kernelResult.entityId,
      intel: intelligence,
      story,
      tradeoff,
      sacrificeCount: Object.keys(card.sacrifices).length,
      segment: domainContext.intent.id || "general"
    };

    for (const [key, pattern] of Object.entries(template)) {
      if (typeof pattern === "string") {
        card[key] = this._interpolate(pattern, context);
      }
    }

    card.title = card.title || rawEntity.title || rawEntity.itemName || kernelResult.entityId;
    card.story = story;
    card.tradeoff = card.tradeoff || tradeoff;
    
    // Legacy support for fitState if it exists in entity for the current segment
    if (rawEntity.fitStates && rawEntity.fitStates[context.segment]) {
      card.fitState = rawEntity.fitStates[context.segment].state;
    }

    return card;
  }

  _interpolate(template, context) {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const parts = path.split(".");
      let value = context;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) return match;
      }
      return String(value);
    });
  }

  _buildNoResult(decisionRunId, ir, execution, config) {
    return {
      decisionRunId,
      status: "no_viable_option",
      evaluatedCount: execution.results.length,
      candidateCount: 0,
      excludedCount: execution.results.length,
      cards: [],
      governance: {
        irHash: ir.irHash,
        logicVersion: config.version || "1.0.0",
        tracedAt: new Date().toISOString()
      }
    };
  }
}

