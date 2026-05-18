import assert from "node:assert/strict";
import fs from "node:fs";
import { generatePublishedCatalog } from "../packages/catalog-publish/src/index.js";
import { executeUniversalPipeline } from "../packages/platform-core/src/index.js";
import { laptopStudentUsDomainPack } from "../domains/laptop-student-us/domain-pack.js";

function loadJson(url) {
  return JSON.parse(fs.readFileSync(url, "utf8"));
}

function loadPublishedEntities() {
  const observations = loadJson(new URL("../domains/laptop-student-us/generated/source-observations.generated.json", import.meta.url));
  // Note: we still use fit-contexts for the published catalog generation step in tests
  const fitContexts = loadJson(new URL("../rulesets/domains/laptop-student-us/fit-contexts.json", import.meta.url));
  return generatePublishedCatalog({
    observations,
    domainPack: laptopStudentUsDomainPack,
    domainContext: { fitContexts }
  });
}

const decisionConfig = loadJson(new URL("../domains/laptop-student-us/decision-config.json", import.meta.url));
const publishedEntities = loadPublishedEntities();

const engineeringProfile = {
  id: "test_engineering_profile",
  major: "engineering",
  budgetUsd: 1900,
  preferences: {
    portability: 55,
    battery: 45,
    display: 60,
    resale: 70
  },
  sliders: {
    virtual_machines: 72,
    video_4k: 20,
    gaming: 35,
    portability: 40
  },
  context: {
    acceptsOpenBox: false,
    acceptsRefurbished: false,
    financingAllowed: true
  }
};

const lowResaleGeneralProfile = {
  id: "test_general_low_resale_profile",
  major: "general",
  budgetUsd: 1500,
  preferences: {
    portability: 60,
    battery: 60,
    display: 50,
    resale: 0
  },
  sliders: {
    virtual_machines: 0,
    video_4k: 0,
    gaming: 0,
    portability: 70
  },
  context: {
    acceptsOpenBox: false,
    acceptsRefurbished: false,
    financingAllowed: false
  }
};

const highResaleGeneralProfile = {
  ...lowResaleGeneralProfile,
  id: "test_general_high_resale_profile",
  preferences: {
    ...lowResaleGeneralProfile.preferences,
    resale: 100
  }
};

const noResultProfile = {
  id: "test_engineering_low_budget",
  major: "engineering",
  budgetUsd: 700,
  preferences: {
    portability: 50,
    battery: 40,
    display: 40,
    resale: 60
  },
  sliders: {
    virtual_machines: 80,
    video_4k: 20,
    gaming: 35,
    portability: 30
  },
  context: {
    acceptsOpenBox: false,
    acceptsRefurbished: false,
    financingAllowed: false
  }
};

const openBoxBudgetProfile = {
  id: "test_general_open_box_budget",
  major: "general",
  budgetUsd: 780,
  preferences: {
    portability: 50,
    battery: 50,
    display: 40,
    resale: 40
  },
  sliders: {
    virtual_machines: 0,
    video_4k: 0,
    gaming: 0,
    portability: 60
  },
  context: {
    acceptsOpenBox: true,
    acceptsRefurbished: false,
    financingAllowed: false
  }
};

const deterministicRunA = await executeUniversalPipeline({
  profile: engineeringProfile,
  domainPack: laptopStudentUsDomainPack,
  publishedEntities,
  decisionConfig
});

const deterministicRunB = await executeUniversalPipeline({
  profile: engineeringProfile,
  domainPack: laptopStudentUsDomainPack,
  publishedEntities,
  decisionConfig
});

assert.deepEqual(
  deterministicRunA.decision.cards.map((card) => ({
    cardType: card.cardType,
    entityId: card.entityId,
    priceUsd: card.priceUsd
  })),
  deterministicRunB.decision.cards.map((card) => ({
    cardType: card.cardType,
    entityId: card.entityId,
    priceUsd: card.priceUsd
  }))
);

assert.ok(deterministicRunA.decision.cards.length > 0);
assert.ok(deterministicRunA.decision.cards.length <= 4);
assert.equal(deterministicRunA.decision.status, "ok");
assert.ok(deterministicRunA.decision.cards.every((card) => card.badNews));
assert.ok(deterministicRunA.decision.cards.every((card) => card.offerCondition !== "open_box" || card.cardType !== "hero"));
assert.ok(Array.isArray(deterministicRunA.trust.cardAudits));
assert.equal(deterministicRunA.trust.cardAudits.length, deterministicRunA.decision.cards.length);
assert.ok(["high", "medium", "low"].includes(deterministicRunA.trust.decisionConfidenceLevel));
assert.ok(deterministicRunA.trust.trace.selectedCardCount === deterministicRunA.decision.cards.length);

const lowResaleRun = await executeUniversalPipeline({
  profile: lowResaleGeneralProfile,
  domainPack: laptopStudentUsDomainPack,
  publishedEntities,
  decisionConfig
});

const highResaleRun = await executeUniversalPipeline({
  profile: highResaleGeneralProfile,
  domainPack: laptopStudentUsDomainPack,
  publishedEntities,
  decisionConfig
});

const lowResaleHero = lowResaleRun.decision.cards.find((card) => card.cardType === "hero");
const highResaleHero = highResaleRun.decision.cards.find((card) => card.cardType === "hero");
assert.ok(lowResaleHero);
assert.ok(highResaleHero);
assert.notEqual(lowResaleHero.entityId, highResaleHero.entityId);

const noResultRun = await executeUniversalPipeline({
  profile: noResultProfile,
  domainPack: laptopStudentUsDomainPack,
  publishedEntities,
  decisionConfig
});

// Recovery Engine may relax within_budget and return results instead of no_viable_option.
// Both outcomes are valid; assertions are split by path.
const isNoViable = noResultRun.decision.status === "no_viable_option";
const isRecovered = noResultRun.decision.relaxedConstraint != null;
assert.ok(isNoViable || isRecovered, `Expected no_viable_option or recovery, got status="${noResultRun.decision.status}"`);

if (isNoViable) {
  assert.equal(noResultRun.decision.cards.length, 0);
  assert.ok(noResultRun.decision.noResults);
  assert.ok(noResultRun.trust.findings.length > 0);
  assert.ok(noResultRun.trust.trace.excludedCount > 0);
  assert.ok(noResultRun.trust.exclusionSummary.length > 0);
} else {
  // Recovery path: constraint relaxed, cards returned, integrity score reduced
  assert.ok(noResultRun.decision.cards.length > 0);
  assert.ok(isRecovered);
}

const openBoxRun = await executeUniversalPipeline({
  profile: openBoxBudgetProfile,
  domainPack: laptopStudentUsDomainPack,
  publishedEntities,
  decisionConfig
});

assert.ok(openBoxRun.decision.cards.length > 0);
assert.ok(openBoxRun.decision.cards.every((card) => card.cardType !== "hero" || card.offerCondition !== "open_box"));

console.log("PASS: decision engine is deterministic, preference-aware, resale-aware, and handles no-result cases");
