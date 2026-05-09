import { DecisionCompiler } from "../packages/decision-compiler/src/index.js";
import { DECISION_TYPES } from "../packages/decision-compiler/src/types.js";

const compiler = new DecisionCompiler();

const invalidSemanticConfig = {
    domainId: "test-semantic-error",
    attributes: {
        "price": { type: "numeric", dataType: DECISION_TYPES.CURRENCY },
        "battery_hours": { type: "numeric", dataType: DECISION_TYPES.NUMERIC }
    },
    metrics: {
        "invalid_sum": {
            "formula": { "op": "add", "args": ["price", "battery_hours"] }
        }
    }
};

console.log("--- TEST: Semantic Type Safety ---");
try {
    compiler.compile(invalidSemanticConfig);
    console.error("❌ Test Failed: Semantic Error was not detected!");
    process.exit(1);
} catch (err) {
    console.log(`✅ Test Passed: Detected semantic error - ${err.message}`);
}
