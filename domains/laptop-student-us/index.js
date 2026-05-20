// Thin re-assembler: pulls all modules together into laptopStudentUsDomainPack
import { CARD_TYPES } from "../../packages/shared-kernel/src/index.js";
import { decisionIR } from "./kernel-state.js";
import { acquireRawObservation, normalizeAcquiredObservation } from "./ingestion.js";
import { publishEntity } from "./entity-publisher.js";
import { entityFitsProfile, isWithinBudget, meetsMinimumFitContext } from "./fit-gates.js";
import { evaluateCandidate, buildNoResults } from "./scoring.js";
import { chooseCard, buildCard, recommendOwnership } from "./card-builder.js";
import { buildEntityFingerprint, resolveEntityFields } from "./identity.js";
import { detectIntentConflicts, attemptRecovery, detectArchetype, buildGrowthArtifacts } from "./insights.js";

export const laptopStudentUsDomainPack = {
  meta: {
    domainId: "laptop-student-us",
    version: "2.0.0",
    identityRules: decisionIR.identityRules,
    entityType: "laptop_variant",
    segmentKey: "major",
    scope: "student laptop buying decisions in the US"
  },

  cardTypes: CARD_TYPES,

  acquireRawObservation,
  normalizeAcquiredObservation,
  publishEntity,
  entityFitsProfile,
  isWithinBudget,
  meetsMinimumFitContext,
  evaluateCandidate,
  buildNoResults,
  chooseCard,
  buildCard,
  recommendOwnership,
  buildEntityFingerprint,
  resolveEntityFields,
  detectIntentConflicts,
  attemptRecovery,
  detectArchetype,
  buildGrowthArtifacts,

  ownershipConfig: {
    renewedDiscountRange: [0.15, 0.32],
    openBoxDiscountRange: [0.08, 0.14],
    defaultOwnershipYears: 4,
    apr: 0.189,
    affiliateTag: 'majorlogic-20',
    marketSources: {
      renewed:    'amazon_renewed',
      openBox:    'ebay',
      financing:  'amazon',
    },
  },
};
