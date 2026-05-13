import crypto from "node:crypto";
import { createHash } from "node:crypto";

export function runDecisionEngine({ profile, catalog, ruleset, domainPack }) {
  const decisionRunId = crypto.randomUUID();
  const originalProfile = { ...profile }; // Store for relaxation measurement

  const preparedProfile = domainPack.prepareDecisionProfile
    ? domainPack.prepareDecisionProfile({ profile, ruleset, catalog })
    : profile;

  // 1. Conflict Sensing: Detect inherent contradictions in user intent
  const intentConflicts = domainPack.detectIntentConflicts 
    ? domainPack.detectIntentConflicts({ profile: preparedProfile, catalog, ruleset })
    : [];

  const matchingEntities = catalog.matchingProfile(preparedProfile);
  const evaluatedCandidates = matchingEntities.map((entity) =>
    domainPack.evaluateCandidate({ profile: preparedProfile, entity, ruleset, catalog })
  );

  const eligibleCandidates = evaluatedCandidates.filter((candidate) => candidate.eligible);
  
  // 2. Recovery & Cognitive Collapse Detection
  let finalCandidates = eligibleCandidates;
  let status = "ok";
  let relaxationScore = 0;

  if (!eligibleCandidates.length) {
    // Attempt recovery via domain-specific relaxation
    const recoveryResult = domainPack.attemptRecovery 
      ? domainPack.attemptRecovery({ profile: preparedProfile, catalog, ruleset })
      : null;

    if (recoveryResult) {
      relaxationScore = recoveryResult.relaxationScore || 0;
      
      // Law of Semantic Drift: Collapse if relaxation > 30%
      if (relaxationScore > 0.30) {
        status = "COGNITIVE_COLLAPSE";
        finalCandidates = [];
      } else {
        status = "RECOVERED";
        finalCandidates = recoveryResult.candidates;
      }
    } else {
      status = "no_viable_option";
      finalCandidates = [];
    }
  }

  // 3. Stability Assessment
  const calculateStability = (candidates) => {
    if (!candidates.length) return 0;
    // Average the match scores and penalize by relaxation
    const avgMatch = candidates.reduce((sum, c) => sum + (c.match || 0), 0) / candidates.length;
    return Math.max(0, (avgMatch / 100) - relaxationScore);
  };

  const stabilityScore = calculateStability(finalCandidates);

  if (status === "no_viable_option" || status === "COGNITIVE_COLLAPSE") {
    return {
      decisionRunId,
      profileId: preparedProfile.profileId ?? "anonymous",
      status,
      stabilityScore: 0,
      relaxationScore,
      conflicts: intentConflicts,
      evaluatedCount: evaluatedCandidates.length,
      candidateCount: finalCandidates.length,
      excludedCount: evaluatedCandidates.length - finalCandidates.length,
      cards: [],
      noResults: domainPack.buildNoResults
        ? domainPack.buildNoResults({ profile: preparedProfile, evaluatedCandidates, status, relaxationScore })
        : null
    };
  }

  const cards = [];
  const selectedEntityIds = new Set();
  let heroCandidate = null;

  for (const cardType of domainPack.cardTypes) {
    const selection = domainPack.chooseCard(
      cardType,
      finalCandidates,
      preparedProfile,
      ruleset,
      { selectedEntityIds: [...selectedEntityIds], heroCandidate }
    );

    if (selection) {
      if (cardType === "hero") heroCandidate = selection;
      selectedEntityIds.add(selection.entity.entityId);
      cards.push(domainPack.buildCard(cardType, selection, preparedProfile, { evaluatedCandidates }));
    }
  }

  // Governance & Immutable Trace
  const inputHash = createHash("sha256").update(JSON.stringify(preparedProfile)).digest("hex");
  const irHash = createHash("sha256").update(JSON.stringify(ruleset)).digest("hex");

  return {
    decisionRunId,
    profileId: preparedProfile.profileId,
    status,
    stabilityScore,
    relaxationScore,
    conflicts: intentConflicts,
    cards,
    evaluatedCount: evaluatedCandidates.length,
    candidateCount: finalCandidates.length,
    excludedCount: evaluatedCandidates.length - finalCandidates.length,
    governance: {
      irHash,
      inputHash,
      logicVersion: ruleset?.logicVersion || "1.0",
      tracedAt: new Date().toISOString()
    }
  };
}
