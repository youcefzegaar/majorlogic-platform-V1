import crypto from "node:crypto";
import { createHash } from "node:crypto";

export async function runDecisionEngine({ profile, catalog, ruleset, domainPack }) {
  const decisionRunId = crypto.randomUUID();
  const originalProfile = { ...profile }; // Store for relaxation measurement

  const preparedProfile = domainPack.prepareDecisionProfile
    ? domainPack.prepareDecisionProfile({ profile, ruleset, catalog })
    : profile;

  // 1. Conflict Sensing: Detect inherent contradictions in user intent
  const intentConflicts = domainPack.detectIntentConflicts 
    ? domainPack.detectIntentConflicts({ profile: preparedProfile, catalog, ruleset })
    : [];

  // Validate inputs
  if (!profile) {
    throw new Error('[ENGINE] Profile is required');
  }
  if (!catalog || typeof catalog.matchingProfile !== 'function') {
    throw new Error('[ENGINE] Invalid catalog object');
  }

  // Safe matching with error handling
  let matchingEntities;
  try {
    matchingEntities = catalog.matchingProfile(preparedProfile);
    if (!Array.isArray(matchingEntities)) {
      console.warn('[ENGINE] Catalog returned non-array result, defaulting to []');
      matchingEntities = [];
    }
  } catch (err) {
    console.error('[ENGINE] Catalog matching failed:', err.message);
    return {
      decisionRunId,
      status: 'catalog_error',
      error: err.message,
      cards: []
    };
  }
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
    
    // 1. Calculate match quality (mean + variance)
    const scores = candidates.map(c => c.match || 0);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize: higher std dev = less stable
    const matchQuality = mean / 100;
    const consistency = Math.max(0, 1 - (stdDev / 100));

    // 2. Apply relaxation penalty (but capped)
    const relaxationPenalty = Math.min(relaxationScore, 0.40);

    // 3. Incorporate trust (mocking trust audits for now since they might be inside entity.trust)
    let trustScore = 0.75; // default baseline
    const trustScores = candidates.map(c => c.entity?.trust?.sourceConfidence || 0.75);
    if (trustScores.length > 0) {
      trustScore = trustScores.reduce((sum, val) => sum + val, 0) / trustScores.length;
    }

    // 4. Composite stability = 60% match + 20% consistency + 20% trust
    const stability = (matchQuality * 0.60) + (consistency * 0.20) + (trustScore * 0.20);
    return Math.max(0, Math.min(1, stability - relaxationPenalty));
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
      cards.push(await domainPack.buildCard(cardType, selection, preparedProfile, { evaluatedCandidates }));
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
