/**
 * Card Selection — pure functions for ranking candidates and filling card slots.
 * Extracted from DecisionOrchestrator to isolate slot-filling and review-penalty logic.
 */

import { produceReviewIntelligence } from "../../catalog-review-intelligence/src/index.js";
import { buildCard } from "./card-builder.js";

const CRITICAL_CONS = new Set(["thermal_throttling", "performance_issues"]);
const MAJOR_CONS    = new Set(["battery_life", "fan_noise", "build_quality"]);
// Severity mapping for review cons → sacrifice records
const CON_SEVERITY  = (con) =>
  CRITICAL_CONS.has(con) ? 0.8 : MAJOR_CONS.has(con) ? 0.5 : 0.2;

/**
 * Penalizes devices with known cons from reviews.
 * Capped at 15 pts so budget-friendly devices with minor cons remain viable.
 */
export function applyReviewPenalty(candidates, entityLookup, logger) {
  return candidates.map(c => {
    const entity = entityLookup.get(c.entityId) || {};
    const cons   = entity.topCons || [];
    if (cons.length === 0) return c;

    let penalty = 0;
    for (const con of cons) {
      if (CRITICAL_CONS.has(con)) penalty += 5;
      else if (MAJOR_CONS.has(con)) penalty += 3;
      else penalty += 1;
    }

    const cappedPenalty = Math.min(penalty, 15);
    if (cappedPenalty > 0) {
      logger.log(`[ReviewPenalty] ${c.entityId}: -${cappedPenalty} pts (cons: ${cons.join(", ")})`);
    }

    // Inject review cons into trace.sacrifices so the explanation layer can surface them.
    // Preserve existing kernel-recorded sacrifices; only add cons not already present.
    const existingSacrifices = c.trace?.sacrifices ?? {};
    const injectedSacrifices = cons.reduce((acc, con) => {
      if (!existingSacrifices[con]) {
        acc[con] = { type: "review_con", severity: CON_SEVERITY(con), meaning: con.replace(/_/g, " ") };
      }
      return acc;
    }, {});

    const hasCons = Object.keys(injectedSacrifices).length > 0;
    const enrichedTrace = hasCons
      ? { ...c.trace, sacrifices: { ...existingSacrifices, ...injectedSacrifices } }
      : c.trace;

    return { ...c, score: Math.max(0, c.score - cappedPenalty), trace: enrichedTrace };
  });
}

/**
 * Picks one candidate from a list according to the slot strategy.
 * Returns null if no candidate meets the minScore quality gate.
 */
export function pickCandidate(candidates, slot, entityLookup, logger) {
  const priceField = slot.priceField || "price";
  const getPrice = (r) => {
    const raw = entityLookup.get(r.entityId) || {};
    return raw[priceField] || raw.market?.bestOffer?.priceUsd || Infinity;
  };

  const minScore = slot.minScore ?? 0;
  const qualified = minScore > 0 ? candidates.filter(r => r.score >= minScore) : candidates;

  if (qualified.length === 0) {
    logger.log(`[Orchestrator] Slot "${slot.type}" skipped: no candidates meet minScore=${minScore}`);
    return null;
  }

  switch (slot.pickBy) {
    case "highest_score":
      return qualified.sort((a, b) => b.score - a.score)[0];
    case "lowest_price":
      return qualified.sort((a, b) => getPrice(a) - getPrice(b))[0];
    case "best_ratio":
      return qualified.sort((a, b) => {
        const ratioA = a.score / Math.max(getPrice(a), 1);
        const ratioB = b.score / Math.max(getPrice(b), 1);
        return ratioB - ratioA;
      })[0];
    default:
      return qualified[0];
  }
}

/**
 * Fills all card slots defined in the selection strategy.
 *
 * @param {object[]} eligible - kernel results that passed gates
 * @param {object} strategy - selectionStrategy from decision-config
 * @param {object} outputTemplate - outputTemplate from decision-config
 * @param {object[]} rawEntities - full catalog entities
 * @param {object} taxonomy - domain taxonomy (for review intelligence)
 * @param {object} userProfile
 * @param {object} domainContext
 * @param {{ explainer, narrativeCache, logger }} deps
 * @returns {Promise<object[]>} enriched card array
 */
export async function selectCards(eligible, strategy, outputTemplate, rawEntities, taxonomy, userProfile, domainContext, { explainer, narrativeCache, logger }) {
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

    candidates = applyReviewPenalty(candidates, entityLookup, logger);
    const picked = pickCandidate(candidates, slot, entityLookup, logger);
    if (!picked) continue;

    selectedIds.add(picked.entityId);

    const rawEntity = entityLookup.get(picked.entityId) || {};
    const intelligence = produceReviewIntelligence({
      topCons:         rawEntity.topCons || [],
      reviewRiskScore: rawEntity.market?.reviewRiskScore || 0,
      taxonomy,
      reviewCount:     rawEntity.market?.reviewCount || 0,
    });

    const card = await buildCard(slot.type, picked, rawEntity, outputTemplate, intelligence, userProfile, domainContext, { explainer, narrativeCache, logger });
    cards.push(card);
  }

  return cards;
}
