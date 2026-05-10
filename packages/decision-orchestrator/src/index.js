import { DecisionCompiler } from "../../decision-compiler/src/index.js";
import { DecisionKernel } from "../../decision-kernel/src/index.js";
import { createHash, randomUUID } from "node:crypto";

/**
 * Universal Decision Orchestrator
 * 
 * The "brain" that sits on top of the domain-blind Kernel.
 * Driven entirely by a decision-config.json — no domain-specific JS required.
 * 
 * Pipeline:
 *   decision-config.json → Compiler → IR
 *   user profile + entities → Kernel (per entity) → scored results
 *   selection strategy (from config) → ranked cards
 *   output templates (from config) → final decision
 */

export class DecisionOrchestrator {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.compiler = new DecisionCompiler(this.logger);
    this.kernel = new DecisionKernel(this.logger);
  }

  /**
   * Execute a full decision pipeline from config + data.
   * 
   * @param {object} config     — The decision-config.json (domain-agnostic)
   * @param {Array}  entities   — Array of catalog entities
   * @param {object} userProfile — Raw user profile input
   * @returns {object} Full decision result with cards, traces, and governance
   */
  run(config, entities, userProfile) {
    const decisionRunId = randomUUID();
    this.logger.log(`[Orchestrator] Starting decision run: ${decisionRunId}`);

    // ── Phase 1: Profile Mapping ──
    const mappedProfile = this._mapProfile(userProfile, config.profileMapping || {});

    // ── Phase 2: Compile domain config into IR ──
    const ir = this.compiler.compile(config);

    // ── Phase 3: Execute Kernel for every entity ──
    const context = { ...mappedProfile };
    const execution = this.kernel.execute(ir, entities, context);

    // ── Phase 4: Filter eligible entities ──
    const eligible = execution.results.filter(r => r.eligible);
    const excluded = execution.results.filter(r => !r.eligible);

    this.logger.log(`[Orchestrator] ${eligible.length} eligible, ${excluded.length} excluded`);

    if (eligible.length === 0) {
      return this._buildNoResult(decisionRunId, ir, execution, config);
    }

    // ── Phase 5: Card Selection (from config strategy) ──
    const cards = this._selectCards(eligible, config.selectionStrategy || {}, config.outputTemplate || {}, entities);

    // ── Phase 6: Governance Trace ──
    const inputHash = createHash("sha256").update(JSON.stringify(userProfile)).digest("hex");

    return {
      decisionRunId,
      status: "ok",
      profileId: userProfile.id || userProfile.profileId || "anonymous",
      evaluatedCount: execution.results.length,
      candidateCount: eligible.length,
      excludedCount: excluded.length,
      cards,
      governance: {
        irHash: ir.irHash,
        inputHash,
        logicVersion: config.version || "1.0.0",
        tracedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Phase 1: Map raw user profile fields to kernel attribute names.
   * Driven by config.profileMapping.
   * 
   * Example config:
   *   { "budget": "max_price", "major": "segment" }
   * Transforms:
   *   { budget: 1000 } → { max_price: 1000 }
   */
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

  /**
   * Phase 5: Select cards based on strategy from config.
   * 
   * Example strategy:
   *   {
   *     cardSlots: [
   *       { type: "hero",   pickBy: "highest_score" },
   *       { type: "budget", pickBy: "lowest_price", priceField: "price" },
   *       { type: "value",  pickBy: "best_ratio", scoreField: "score", priceField: "price" }
   *     ],
   *     noDuplicates: true
   *   }
   */
  _selectCards(eligible, strategy, outputTemplate, rawEntities) {
    const slots = strategy.cardSlots || [{ type: "hero", pickBy: "highest_score" }];
    const noDuplicates = strategy.noDuplicates !== false;
    const selectedIds = new Set();
    const cards = [];

    // Build entity lookup for raw data access
    const entityLookup = new Map();
    for (const e of rawEntities) {
      entityLookup.set(e.entityId || e.id, e);
    }

    for (const slot of slots) {
      // Filter out already selected entities if noDuplicates
      let candidates = noDuplicates
        ? eligible.filter(r => !selectedIds.has(r.entityId))
        : [...eligible];

      if (candidates.length === 0) continue;

      // Pick the best candidate for this slot
      const picked = this._pickCandidate(candidates, slot, entityLookup);
      if (!picked) continue;

      selectedIds.add(picked.entityId);

      // Build the card using the output template
      const rawEntity = entityLookup.get(picked.entityId) || {};
      const card = this._buildCard(slot.type, picked, rawEntity, outputTemplate);
      cards.push(card);
    }

    return cards;
  }

  /**
   * Pick the best candidate for a given card slot.
   */
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
        // Score per dollar — higher is better
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

  /**
   * Build a card from template + data.
   * 
   * Template uses {field} interpolation:
   *   { title: "{entity.title}", score: "{score}" }
   */
  _buildCard(cardType, kernelResult, rawEntity, template) {
    const card = {
      cardType,
      entityId: kernelResult.entityId,
      score: Math.round(kernelResult.score * 100) / 100,
      eligible: kernelResult.eligible,
      trace: kernelResult.trace
    };

    // Apply template interpolation
    const context = {
      entity: rawEntity,
      score: kernelResult.score,
      scores: kernelResult.trace.scores,
      entityId: kernelResult.entityId
    };

    for (const [key, pattern] of Object.entries(template)) {
      if (typeof pattern === "string") {
        card[key] = this._interpolate(pattern, context);
      }
    }

    // Add entity raw fields for downstream use
    card.title = card.title || rawEntity.title || rawEntity.itemName || kernelResult.entityId;
    card.price = rawEntity.price || rawEntity.market?.bestOffer?.priceUsd || null;

    return card;
  }

  /**
   * Simple template interpolation: "{entity.title}" → "MacBook Pro"
   */
  _interpolate(template, context) {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const parts = path.split(".");
      let value = context;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) return match; // Keep original if not found
      }
      return String(value);
    });
  }

  /**
   * Build no-result response.
   */
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
