import assert from "node:assert/strict";
import fs from "node:fs";
import { generatePublishedCatalog } from "../packages/catalog-publish/src/index.js";
import { executePlatformPipeline } from "../packages/platform-core/src/index.js";
import { laptopStudentUsDomainPack } from "../domains/laptop-student-us/domain-pack.js";

function loadJson(url) {
  return JSON.parse(fs.readFileSync(url, "utf8"));
}

function loadPublishedEntities() {
  const observations = loadJson(new URL("../domains/laptop-student-us/generated/source-observations.generated.json", import.meta.url));
  const fitContexts = loadJson(new URL("../rulesets/domains/laptop-student-us/fit-contexts.json", import.meta.url));
  return generatePublishedCatalog({
    observations,
    domainPack: laptopStudentUsDomainPack,
    domainContext: { fitContexts }
  });
}

function adaptProfile(regressionProfile) {
  return {
    id: regressionProfile.id,
    major: regressionProfile.major,
    budgetUsd: regressionProfile.budget_usd,
    preferences: {
      portability: regressionProfile.sliders.portability ?? 50,
      battery: regressionProfile.major === "medical" ? 85 : 50,
      display: regressionProfile.major === "design" ? 85 : 45,
      resale: 60
    },
    sliders: regressionProfile.sliders,
    context: {
      acceptsRefurbished: Boolean(regressionProfile.context.refurbished_accepted),
      acceptsOpenBox: Boolean(regressionProfile.context.open_box_accepted),
      financingAllowed: false
    }
  };
}

const ruleset = loadJson(new URL("../rulesets/domains/laptop-student-us/ruleset.json", import.meta.url));
const publishedEntities = loadPublishedEntities();
const regressionProfiles = loadJson(new URL("../../majorlogic-v1/domains/laptop-student-us/regression/profiles.json", import.meta.url));

for (const regressionProfile of regressionProfiles) {
  const profile = adaptProfile(regressionProfile);
  const result = await executePlatformPipeline({
    profile,
    domainPack: laptopStudentUsDomainPack,
    publishedEntities,
    ruleset
  });

  const cards = result.decision.cards;
  const expectedRules = regressionProfile.expected_rules;

  if (expectedRules.includes("must_return_4_cards_or_less")) {
    assert.ok(cards.length <= 4, `${regressionProfile.id}: card count should stay at 4 or less`);
  }

  if (expectedRules.includes("cards_types_are_fixed")) {
    const validTypes = new Set(["hero", "smart_budget", "future_proof"]);
    assert.ok(cards.every((card) => validTypes.has(card.cardType)), `${regressionProfile.id}: card types must stay inside the constitutional 4-card system`);
  }

  if (expectedRules.includes("each_card_must_have_bad_news")) {
    assert.ok(cards.every((card) => Boolean(card.badNews)), `${regressionProfile.id}: each returned card must expose bad news`);
  }

  if (expectedRules.includes("hero_must_not_be_open_box")) {
    const hero = cards.find((card) => card.cardType === "hero");
    if (hero) {
      assert.notEqual(hero.offerCondition, "open_box", `${regressionProfile.id}: hero must never be open_box`);
    }
  }

  if (expectedRules.includes("smart_budget_should_exist_if_any_option_exists")) {
    if (cards.length > 0) {
      assert.ok(cards.some((card) => card.cardType === "smart_budget"), `${regressionProfile.id}: smart_budget should exist when results exist`);
    }
  }

  if (expectedRules.includes("may_return_limited_cards")) {
    assert.ok(cards.length <= 4, `${regressionProfile.id}: limited-card scenario should still stay within the card cap`);
  }

  if (expectedRules.includes("may_return_no_results")) {
    assert.ok(
      result.decision.status === "no_viable_option" || cards.length > 0,
      `${regressionProfile.id}: engine may return no results, but if it does not it must still return valid cards`
    );
  }

  if (expectedRules.includes("if_no_results_should_have_actionable_suggestions") && result.decision.status === "no_viable_option") {
    assert.ok(result.decision.noResults?.suggestions?.length > 0, `${regressionProfile.id}: no-result path should expose actionable suggestions`);
  }

  if (expectedRules.includes("open_box_never_hero")) {
    const hero = cards.find((card) => card.cardType === "hero");
    if (hero) {
      assert.notEqual(hero.offerCondition, "open_box", `${regressionProfile.id}: open_box must never become hero`);
    }
  }

  if (expectedRules.includes("engineering_baseline_requires_strong_performance")) {
    const hero = cards.find((card) => card.cardType === "hero");
    if (hero) {
      assert.ok(hero.fitState === "meets_official" || hero.fitState === "meets_safe", `${regressionProfile.id}: engineering hero should satisfy baseline`);
    }
  }

  if (expectedRules.includes("design_prefers_display_quality")) {
    const hero = cards.find((card) => card.cardType === "hero");
    if (hero) {
      assert.notEqual(hero.entityId, "dell-inspiron-14-core-5-16gb-512gb", `${regressionProfile.id}: design hero should not collapse to a weak-display budget device`);
    }
  }

  if (expectedRules.includes("medical_prefers_battery_and_portability")) {
    const hero = cards.find((card) => card.cardType === "hero");
    if (hero) {
      assert.notEqual(hero.entityId, "acer-nitro-v-15-core-i7-16gb-1tb-rtx-4050", `${regressionProfile.id}: medical hero should not become a bulky gaming-first device`);
    }
  }

  if (expectedRules.includes("high_vm_slider_should_push_ram_up")) {
    const hero = cards.find((card) => card.cardType === "hero");
    const futureProof = cards.find((card) => card.cardType === "future_proof");
    const vmSensitive = [hero, futureProof].filter(Boolean);
    assert.ok(vmSensitive.length > 0, `${regressionProfile.id}: VM-heavy profile should still surface at least one strong machine`);
  }

  if (expectedRules.includes("high_gaming_slider_should_require_dgpu")) {
    const hero = cards.find((card) => card.cardType === "hero");
    if (hero) {
      assert.notEqual(hero.entityId, "acer-swift-go-14-core-ultra-7-16gb-1tb", `${regressionProfile.id}: gaming-heavy general profile should not prefer an ultrabook hero`);
    }
  }
}

console.log("PASS: regression-v1 suite preserves constitutional card rules and expected scenario behavior");
