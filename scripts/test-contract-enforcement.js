import { DecisionCompiler } from "../packages/decision-compiler/src/index.js";
import { DECISION_TYPES } from "../packages/decision-compiler/src/types.js";

const compiler = new DecisionCompiler();

console.log("--- TEST: Type Contract Enforcement ---");

// Test 1: Minimum Arguments Contract
const minArgsConfig = {
    domainId: "test-min-args",
    attributes: { "price": { type: "numeric", dataType: DECISION_TYPES.CURRENCY } },
    metrics: {
        "invalid_sum": { "formula": { "op": "add", "args": ["price"] } }
    }
};

try {
    compiler.compile(minArgsConfig);
} catch (err) {
    console.log(`✅ Passed Case 1: Detected min args violation - ${err.message}`);
}

// Test 2: Incompatible Comparison Contract
const compareConfig = {
    domainId: "test-compare",
    attributes: { 
        "price": { type: "numeric", dataType: DECISION_TYPES.CURRENCY },
        "score": { type: "numeric", dataType: DECISION_TYPES.SCORE }
    },
    gates: {
        "invalid_gate": { "condition": { "op": "gte", "left": "price", "right": "score" } }
    }
};

try {
    compiler.compile(compareConfig);
} catch (err) {
    console.log(`✅ Passed Case 2: Detected comparison violation - ${err.message}`);
}
