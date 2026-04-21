import crypto from "node:crypto";

export function runDecisionEngine({ profile, catalog, ruleset, domainPack }) {
  const decisionRunId = crypto.randomUUID();
  const preparedProfile = domainPack.prepareDecisionProfile
    ? domainPack.prepareDecisionProfile({ profile, ruleset, catalog })
    : profile;

  const matchingEntities = catalog.matchingProfile(preparedProfile);
  const evaluatedCandidates = matchingEntities.map((entity) =>
    domainPack.evaluateCandidate({ profile: preparedProfile, entity, ruleset, catalog })
  );
  const eligibleCandidates = evaluatedCandidates.filter((candidate) => candidate.eligible);
  const excludedReasonCounts = evaluatedCandidates
    .filter((candidate) => !candidate.eligible)
    .flatMap((candidate) => candidate.exclusionReasons)
    .reduce((counts, reason) => {
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});

  if (!eligibleCandidates.length) {
    return {
      decisionRunId,
      profileId: preparedProfile.profileId ?? preparedProfile.id ?? "anonymous_profile",
      segment: preparedProfile[domainPack.meta.segmentKey],
      evaluatedCount: evaluatedCandidates.length,
      candidateCount: 0,
      excludedCount: evaluatedCandidates.length,
      excludedReasonCounts,
      status: "no_viable_option",
      cards: [],
      noResults: domainPack.buildNoResults
        ? domainPack.buildNoResults({ profile: preparedProfile, evaluatedCandidates, ruleset, catalog })
        : null
    };
  }

  const cards = [];
  const selectedEntityIds = new Set();
  let heroCandidate = null;

  for (const cardType of domainPack.cardTypes) {
    let selection = domainPack.chooseCard(
      cardType,
      eligibleCandidates,
      preparedProfile,
      ruleset,
      {
        selectedEntityIds: [...selectedEntityIds],
        heroCandidate
      }
    );

    if (!selection) {
      selection = domainPack.chooseCard(
        cardType,
        eligibleCandidates,
        preparedProfile,
        ruleset,
        {
          selectedEntityIds: [],
          heroCandidate,
          allowDuplicates: true
        }
      );
    }

    if (!selection) {
      continue;
    }

    if (cardType === "hero") {
      heroCandidate = selection;
    }

    selectedEntityIds.add(selection.entity.entityId);
    cards.push(domainPack.buildCard(cardType, selection, preparedProfile));
  }

  return {
    decisionRunId,
    profileId: preparedProfile.profileId ?? preparedProfile.id ?? "anonymous_profile",
    segment: preparedProfile[domainPack.meta.segmentKey],
    evaluatedCount: evaluatedCandidates.length,
    candidateCount: eligibleCandidates.length,
    excludedCount: evaluatedCandidates.length - eligibleCandidates.length,
    excludedReasonCounts,
    status: "ok",
    cards,
    noResults: null
  };
}
