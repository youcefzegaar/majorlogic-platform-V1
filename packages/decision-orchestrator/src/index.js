import { DecisionCompiler } from "../../decision-compiler/src/index.js";
import { DecisionKernel } from "../../decision-kernel/src/index.js";
import { DecisionExplainer } from "../../decision-explanation/src/index.js";
import { produceReviewIntelligence } from "../../catalog-review-intelligence/src/index.js";
import { createHash, randomUUID } from "node:crypto";

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
  }

  /**
   * Execute a full decision pipeline from config + data.
   */
  run(config, entities, userProfile) {
    this._validateInput(config, entities, userProfile);
    
    const decisionRunId = randomUUID();
    this.logger.log(`[Orchestrator] Starting decision run: ${decisionRunId}`);

    // ── Phase 1: Profile Mapping ──
    const mappedProfile = this._mapProfile(userProfile, config.profileMapping || {});

    // ── Phase 2: Compile domain config into IR (with Caching) ──
    const ir = this._getCompiledIR(config);

    // ── Phase 3: Execute Kernel for every entity ──
    const context = { ...mappedProfile };
    const execution = this.kernel.execute(ir, entities, context);

    // ── Phase 4: Filter & Analyze Exclusions (Transparency) ──
    const eligible = execution.results.filter(r => r.eligible);
    const excluded = execution.results.filter(r => !r.eligible);

    // Transparency: Explain why top candidates were excluded
    const topExcludedStories = excluded
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(ex => {
            const title = entities.find(e => (e.entityId || e.id) === ex.entityId)?.title || ex.entityId;
            return {
                entityId: ex.entityId,
                title,
                reason: this.explainer.explainExclusion(ex.trace, title)
            };
        });

    this.logger.log(`[Orchestrator] ${eligible.length} eligible, ${excluded.length} excluded`);

    if (eligible.length === 0) {
      return {
          ...this._buildNoResult(decisionRunId, ir, execution, config),
          topExcludedStories
      };
    }

    // ── Phase 5: Card Selection & Signal Integration ──
    const cards = this._selectCards(eligible, config.selectionStrategy || {}, config.outputTemplate || {}, entities, config.taxonomy || {}, userProfile);

    // ── Phase 6: Governance Trace ──
    const inputHash = createHash("sha256").update(JSON.stringify(userProfile)).digest("hex");

    return {
      decisionRunId,
      status: "ok",
      profileId: userProfile.id || userProfile.profileId || "anonymous",
      evaluatedCount: execution.results.length,
      candidateCount: eligible.length,
      excludedCount: excluded.length,
      topExcludedStories, // Transparency layer
      cards,
      governance: {
        irHash: ir.irHash,
        inputHash,
        logicVersion: config.version || "1.0.0",
        tracedAt: new Date().toISOString()
      }
    };
  }

  _validateInput(config, entities, userProfile) {
    if (!config || !config.domainId) throw new Error("Orchestrator Error: Missing config.domainId");
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
    return mapped;
  }

  _selectCards(eligible, strategy, outputTemplate, rawEntities, taxonomy, userProfile) {
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

      const card = this._buildCard(slot.type, picked, rawEntity, outputTemplate, intelligence, userProfile);
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

    switch (slot.pickBy) {
      case "highest_score":
        return candidates.sort((a, b) => b.score - a.score)[0];
      case "lowest_price":
        return candidates.sort((a, b) => getPrice(a) - getPrice(b))[0];
      case "best_ratio": {
        return candidates.sort((a, b) => {
          const ratioA = a.score / Math.max(getPrice(a), 1);
          const ratioB = b.score / Math.max(getPrice(b), 1);
          return ratioB - ratioA;
        })[0];
      }
      default:
        return candidates[0];
    }
  }

  _buildCard(cardType, kernelResult, rawEntity, template, intelligence, userProfile) {
    const card = {
      cardType,
      entityId: kernelResult.entityId,
      score: Math.round(kernelResult.score * 100) / 100,
      eligible: kernelResult.eligible,
      intelligence, // Full review intelligence payload
      trace: kernelResult.trace
    };

    const story = this.explainer.explain(kernelResult.trace, rawEntity.title || rawEntity.itemName || kernelResult.entityId, userProfile);
    const tradeoff = this.explainer.explainTradeoff(kernelResult.trace, rawEntity) || intelligence.primaryWarning;

    const context = {
      entity: rawEntity,
      score: kernelResult.score,
      scores: kernelResult.trace.scores,
      entityId: kernelResult.entityId,
      intel: intelligence,
      story,
      tradeoff
    };

    for (const [key, pattern] of Object.entries(template)) {
      if (typeof pattern === "string") {
        card[key] = this._interpolate(pattern, context);
      }
    }

    card.title = card.title || rawEntity.title || rawEntity.itemName || kernelResult.entityId;
    card.price = rawEntity.price || rawEntity.market?.bestOffer?.priceUsd || null;
    card.tradeoff = card.tradeoff || tradeoff;

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

