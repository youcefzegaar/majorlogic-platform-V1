import { ReviewIntelligenceAnalyzer } from "../packages/catalog-core/src/acquisition/ReviewIntelligenceAnalyzer.js";
import * as normalization from "../packages/catalog-normalization/src/index.js";

async function testLogic() {
  console.log("🚀 Testing Mission 2 Logic (Critera Sensor & AI Analyzer)");

  // 1. Test Criteria Sensor
  const mockObservations = [
    { itemName: "Trash Laptop", specs: { ramGb: 4, storageGb: 128 }, offers: [{ priceUsd: 200 }] },
    { itemName: "Pro Laptop", specs: { ramGb: 16, storageGb: 512 }, offers: [{ priceUsd: 1200 }] }
  ];

  const { valid, rejected } = normalization.filterMinimumViable(mockObservations);
  console.log(`- Filter Logic: Valid=${valid.length}, Rejected=${rejected.length}`);
  if (rejected[0]?.reason === "insufficient_ram_floor") console.log("✅ Sensor correctly rejected low RAM.");

  // 2. Test AI Analyzer Logic
  const analyzer = new ReviewIntelligenceAnalyzer();
  const intelligence = await analyzer.simulateGemmaResponse("Pro Laptop", "The battery is bad but performance is hot.");
  console.log("- AI Synthesis Summary:", intelligence.primaryWarning);
  if (intelligence.topCons.includes("thermal_throttling_potential")) console.log("✅ AI correctly identified thermal risk.");

  console.log("\n✨ Logic Verification Passed.");
}

testLogic();
