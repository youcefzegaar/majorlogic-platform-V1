import { ReviewIntelligenceAnalyzer } from "../packages/catalog-core/src/acquisition/ReviewIntelligenceAnalyzer.js";
import * as normalization from "../packages/catalog-normalization/src/index.js";
import assert from "node:assert";

async function testLogic() {
  console.log("🚀 Testing Mission 2 Logic (Criteria Sensor & AI Analyzer)");

  // 1. Test Criteria Sensor
  const mockObservations = [
    { itemName: "Trash Laptop", specs: { ramGb: 4, storageGb: 128 }, offers: [{ priceUsd: 200 }] },
    { itemName: "Pro Laptop", specs: { ramGb: 16, storageGb: 512 }, offers: [{ priceUsd: 1200 }] }
  ];

  const { valid, rejected } = normalization.filterMinimumViable(mockObservations);
  console.log(`- Filter Logic: Valid=${valid.length}, Rejected=${rejected.length}`);
  
  assert.strictEqual(valid.length, 1, "Should have 1 valid laptop");
  assert.strictEqual(rejected[0].reason, "insufficient_ram_floor", "Should reject for RAM floor");

  // 2. Test AI Analyzer Logic (Public API)
  const analyzer = new ReviewIntelligenceAnalyzer();
  
  // Test Path 1: Negative signals
  const badIntel = await analyzer.analyze("Pro Laptop", "The battery life is poor and the fan is loud.");
  console.log("- AI Synthesis (Negative Test):", badIntel.primaryWarning);
  assert.ok(badIntel.topCons.includes("diminished_battery_endurance"), "Should detect bad battery");
  assert.ok(badIntel.topCons.includes("aggressive_fan_profile"), "Should detect loud fan");

  // Test Path 2: Positive signals (Verify Issue NEW-3 fix)
  const goodIntel = await analyzer.analyze("Pro Laptop", "The battery life is amazing and heat management is excellent.");
  console.log("- AI Synthesis (Positive Test):", goodIntel.primaryWarning);
  assert.strictEqual(goodIntel.topCons.length, 0, "Should NOT find issues in positive context");

  console.log("\n✨ Logic Verification Passed with Strong Assertions.");
}

testLogic().catch(err => {
  console.error("❌ Verification Failed:", err.message);
  process.exit(1);
});
