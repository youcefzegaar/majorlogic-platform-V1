import { DecisionCompiler } from "../packages/decision-compiler/src/index.js";

const compiler = new DecisionCompiler();

const circularConfig = {
    domainId: "test-cycle",
    metrics: {
        "score_a": {
            "formula": { "op": "add", "args": ["score_b"] }
        },
        "score_b": {
            "formula": { "op": "add", "args": ["score_a"] }
        }
    }
};

console.log("--- TEST: Cycle Detection ---");
try {
    compiler.compile(circularConfig);
    console.error("❌ Test Failed: Cycle was not detected!");
    process.exit(1);
} catch (err) {
    console.log(`✅ Test Passed: Detected cycle - ${err.message}`);
}
