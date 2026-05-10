import { QualityIntelligence } from "../packages/quality-intelligence/src/index.js";

const engine = new QualityIntelligence({
    confidenceThreshold: 50, // نحتاج 50 مراجعة للثقة التامة
    globalAverage: 3.5      // المتوسط العام للسوق
});

console.log("--- TEST: Quality Intelligence (Bayesian Risk) ---");

// المنتج أ: تقييم خادع (مثالي لكن بمراجعتين فقط)
const scoreA = engine.calculateWeightedScore(2, 5.0);
console.log(`Product A (5.0 stars, 2 reviews) -> Weighted Score: ${scoreA.toFixed(2)}`);

// المنتج ب: تقييم موثوق (4.5 نجوم بـ 500 مراجعة)
const scoreB = engine.calculateWeightedScore(500, 4.5);
console.log(`Product B (4.5 stars, 500 reviews) -> Weighted Score: ${scoreB.toFixed(2)}`);

if (scoreB > scoreA) {
    console.log("✅ Success: Bayesian engine correctly favored the high-confidence product.");
} else {
    console.error("❌ Failure: System favored the low-confidence outlier.");
}

console.log("\n--- TEST: Fatal Flaw Detection ---");
const signals = {
    "battery_life": { negativeCount: 20 },
    "display": { negativeCount: 2 }
};
const risks = engine.detectFatalRisks(signals, 100); // 100 مراجعة إجمالية

console.log("Detected Risks:", risks);
if (risks.length > 0 && risks[0].node === "battery_life") {
    console.log("✅ Success: Correcty detected 'battery_life' as a fatal recurring flaw.");
}
