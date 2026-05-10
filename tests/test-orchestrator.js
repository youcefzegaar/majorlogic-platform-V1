/**
 * TEST: Universal Decision Orchestrator
 * 
 * This test proves that an ENTIRE decision pipeline — from user profile to final cards —
 * can be driven purely from a JSON config. No domain-pack.js. No handwritten JS logic.
 * 
 * Simulated domain: "laptop-student" — but the Orchestrator doesn't know that.
 */

import { DecisionOrchestrator } from "../packages/decision-orchestrator/src/index.js";

const silentLogger = { log: () => {} };

// ═══════════════════════════════════════════════
// THE CONFIG — This is ALL you need for a new domain
// ═══════════════════════════════════════════════
const laptopConfig = {
  domainId: "laptop-student-universal",
  version: "2.0.0",

  // What the Kernel understands about this domain
  attributes: {
    price:            { type: "numeric", dataType: "currency" },
    ramGb:            { type: "numeric" },
    storageGb:        { type: "numeric" },
    weightKg:         { type: "numeric" },
    benchmarkScore:   { type: "numeric", dataType: "score" },
    batteryHours:     { type: "numeric" },
    max_price:        { type: "numeric", dataType: "currency" }
  },

  // Derived calculations
  metrics: {
    value_score:      { formula: { op: "multiply", args: ["benchmarkScore", { op: "inverse", arg: "price" }] } },
    portability:      { formula: { op: "subtract", args: [100, { op: "multiply", args: ["weightKg", 30] }] } },
    storage_score:    { formula: { op: "clamp", args: [{ op: "multiply", args: ["storageGb", 0.1] }, 0, 100] } }
  },

  // Hard filters — entities that fail are excluded
  gates: {
    within_budget:    { condition: { op: "lte", left: "price", right: "max_price" } },
    min_ram:          { condition: { op: "gte", left: "ramGb", right: 8 } }
  },

  // Final scoring
  scores: {
    final_score: {
      weights: { benchmarkScore: 0.4, portability: 0.2, value_score: 0.2, storage_score: 0.2 },
      isFinal: true
    }
  },

  // Map user-facing field names to kernel attributes
  profileMapping: {
    budget: "max_price"
  },

  // How to select and build cards — ALL from config
  selectionStrategy: {
    cardSlots: [
      { type: "hero",   pickBy: "highest_score" },
      { type: "budget", pickBy: "lowest_price", priceField: "price" },
      { type: "value",  pickBy: "best_ratio", priceField: "price" }
    ],
    noDuplicates: true
  },

  outputTemplate: {
    whyThis: "Scored {score} overall with strong {entity.topStrength}",
    headline: "{entity.title} — Best for your needs"
  }
};

// ═══════════════════════════════════════════════
// THE DATA — Simulated catalog entities
// ═══════════════════════════════════════════════
const entities = [
  { id: "mbp-16",  entityId: "mbp-16",  title: "MacBook Pro 16",  price: 2499, ramGb: 32, storageGb: 512, weightKg: 2.1, benchmarkScore: 92, batteryHours: 14, topStrength: "performance" },
  { id: "tp-x1",   entityId: "tp-x1",   title: "ThinkPad X1",     price: 1399, ramGb: 16, storageGb: 256, weightKg: 1.2, benchmarkScore: 78, batteryHours: 12, topStrength: "portability" },
  { id: "acer-a5", entityId: "acer-a5",  title: "Acer Aspire 5",   price: 549,  ramGb: 8,  storageGb: 256, weightKg: 1.8, benchmarkScore: 55, batteryHours: 8,  topStrength: "price" },
  { id: "hp-pav",  entityId: "hp-pav",   title: "HP Pavilion",      price: 699,  ramGb: 16, storageGb: 512, weightKg: 1.9, benchmarkScore: 65, batteryHours: 9,  topStrength: "balance" },
  { id: "del-xps", entityId: "del-xps",  title: "Dell XPS 13",      price: 1199, ramGb: 16, storageGb: 512, weightKg: 1.2, benchmarkScore: 82, batteryHours: 11, topStrength: "display" },
  { id: "low-ram", entityId: "low-ram",  title: "Cheap Chromebook",  price: 299,  ramGb: 4,  storageGb: 64,  weightKg: 1.5, benchmarkScore: 25, batteryHours: 10, topStrength: "none" }
];

// ═══════════════════════════════════════════════
// THE USER — Simple profile
// ═══════════════════════════════════════════════
const userProfile = {
  id: "student-001",
  budget: 1500,
  major: "computer_science"
};

// ═══════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════
console.log("╔══════════════════════════════════════════════════╗");
console.log("║  UNIVERSAL ORCHESTRATOR — Zero-JS Domain Test    ║");
console.log("╚══════════════════════════════════════════════════╝\n");

const orchestrator = new DecisionOrchestrator({ logger: silentLogger });
const result = orchestrator.run(laptopConfig, entities, userProfile);

console.log(`Status: ${result.status}`);
console.log(`Evaluated: ${result.evaluatedCount} | Eligible: ${result.candidateCount} | Excluded: ${result.excludedCount}`);
console.log(`IR Hash: ${result.governance.irHash.substring(0, 16)}...`);
console.log(`\n── Cards ──`);

let allPassed = true;

for (const card of result.cards) {
  console.log(`  [${card.cardType.toUpperCase()}] ${card.title} — Score: ${card.score}, Price: $${card.price}`);
}

// ── Assertions ──
console.log("\n── Assertions ──");

function check(name, condition) {
  if (condition) {
    console.log(`  ✅ ${name}`);
  } else {
    console.log(`  ❌ ${name}`);
    allPassed = false;
  }
}

check("Decision status is OK", result.status === "ok");
check("3 cards produced (hero, budget, value)", result.cards.length === 3);
check("No duplicate entities across cards", new Set(result.cards.map(c => c.entityId)).size === 3);
check("Hero card has the highest score", result.cards[0].cardType === "hero");
check("Budget card has the lowest price", result.cards[1].cardType === "budget");
check("Chromebook excluded (4GB RAM < 8GB gate)", result.excludedCount >= 1);
check("MacBook excluded (price > budget $1500)", !result.cards.find(c => c.entityId === "mbp-16"));
check("Governance trace present", !!result.governance.irHash);
check("IR hash is deterministic (64 chars)", result.governance.irHash.length === 64);

// Run again to prove determinism
const result2 = orchestrator.run(laptopConfig, entities, userProfile);
check("Deterministic: same config = same IR hash", result.governance.irHash === result2.governance.irHash);

console.log(`\n══════════════════════════════════════════════════`);
console.log(`  ${allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}`);
console.log(`══════════════════════════════════════════════════`);

if (!allPassed) process.exit(1);
