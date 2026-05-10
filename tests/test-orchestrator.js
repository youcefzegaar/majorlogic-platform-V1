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
    whyThis: "{story}",
    headline: "{entity.title} — Best for your needs",
    warning: "{intel.primaryWarning}",
    tradeoff: "{tradeoff}"
  }
};

// ═══════════════════════════════════════════════
// THE DATA — Simulated catalog entities
// ═══════════════════════════════════════════════
const entities = [
  { 
    id: "mbp-16",  
    entityId: "mbp-16",  
    title: "MacBook Pro 16",  
    price: 2499, ramGb: 32, storageGb: 512, weightKg: 2.1, benchmarkScore: 92, batteryHours: 14, 
    topStrength: "performance",
    topCons: ["High price", "Heavy"],
    market: { reviewRiskScore: 0.1, reviewCount: 150 }
  },
  { 
    id: "tp-x1",   
    entityId: "tp-x1",   
    title: "ThinkPad X1",     
    price: 1399, ramGb: 16, storageGb: 256, weightKg: 1.2, benchmarkScore: 78, batteryHours: 12, 
    topStrength: "portability",
    topCons: ["Expensive upgrades"],
    market: { reviewRiskScore: 0.05, reviewCount: 85 }
  },
  { 
    id: "hp-pav",  
    entityId: "hp-pav",   
    title: "HP Pavilion",      
    price: 699,  ramGb: 16, storageGb: 512, weightKg: 1.9, benchmarkScore: 65, batteryHours: 9, 
    topStrength: "balance",
    topCons: ["Plastic build", "Dim screen"],
    market: { reviewRiskScore: 0.3, reviewCount: 210 }
  }
];

// ═══════════════════════════════════════════════
// THE USER — Simple profile
// ═══════════════════════════════════════════════
const userProfile = {
  id: "student-001",
  budget: 1500, // Trigger exclusion for MacBook
  major: "Computer Science"
};

// ═══════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════
console.log("╔══════════════════════════════════════════════════╗");
console.log("║  UNIVERSAL ORCHESTRATOR — Trust Capital Test     ║");
console.log("╚══════════════════════════════════════════════════╝\n");

const orchestrator = new DecisionOrchestrator({ logger: silentLogger });
const result = orchestrator.run(laptopConfig, entities, userProfile);

console.log(`Status: ${result.status}`);
console.log(`Evaluated: ${result.evaluatedCount} | Eligible: ${result.candidateCount}`);

console.log(`\n── [1] WINNERS (Expert Recommendations) ──`);
for (const card of result.cards) {
  console.log(`\n  [${card.cardType.toUpperCase()}] ${card.title}`);
  console.log(`  Expert Note: ${card.whyThis}`);
  console.log(`  The Catch:   ${card.tradeoff || "None detected"}`);
}

console.log(`\n── [2] TRANSPARENCY (Why we skipped some) ──`);
for (const ex of result.topExcludedStories) {
  console.log(`  - ${ex.title}: ${ex.reason}`);
}

// ── Assertions ──
console.log("\n── Assertions ──");
let allPassed = true;
function check(name, condition) {
  if (condition) console.log(`  ✅ ${name}`);
  else { console.log(`  ❌ ${name}`); allPassed = false; }
}

check("Decision status is OK", result.status === "ok");
check("Exclusion stories generated", result.topExcludedStories.length > 0);
check("MacBook exclusion explained by budget", result.topExcludedStories.find(s => s.entityId === "mbp-16")?.reason.includes("budget"));
check("Trade-off story generated for winners", result.cards.some(c => c.tradeoff));
check("Human context used in story", result.cards[0].whyThis.includes("Computer Science"));

console.log(`\n══════════════════════════════════════════════════`);
console.log(`  ${allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}`);
console.log(`══════════════════════════════════════════════════`);
if (!allPassed) process.exit(1);

console.log(`\n══════════════════════════════════════════════════`);
console.log(`  ${allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}`);
console.log(`══════════════════════════════════════════════════`);

if (!allPassed) process.exit(1);
