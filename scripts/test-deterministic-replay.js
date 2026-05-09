import { DecisionCompiler } from "../packages/decision-compiler/src/index.js";
import { DecisionReconstructor } from "../packages/decision-governance/src/index.js";

const compiler = new DecisionCompiler();
const reconstructor = new DecisionReconstructor();

const config = {
    domainId: "replay-test",
    attributes: {
        "price": { type: "numeric" }
    },
    metrics: {
        "score_a": { "formula": { "op": "add", "args": ["price"] } }
    },
    rulesets: {
        "default": { "weights": { "score_a": 1 }, "isDefault": true }
    }
};

const ir = compiler.compile(config);
const input = { id: "item-1", price: 20 };

// 1. Initial Execution
const { results } = reconstructor.kernel.execute(ir, [input]);
const originalTrace = results[0].trace;

console.log("--- TEST: Deterministic Replay ---");

async function runTest() {
    // 2. Replay with CORRECT data
    console.log("[TEST] Replaying with correct historical data...");
    const pass = await reconstructor.replayAndVerify({ ir, input, originalTrace });
    if (pass.isMatched) {
        console.log("✅ Replay Success: Results matched perfectly.");
    } else {
        console.error("❌ Replay Failed: Results should have matched.");
        process.exit(1);
    }

    // 3. Replay with MODIFIED data (Simulating corruption)
    console.log("\n[TEST] Replaying with modified data...");
    const corruptedInput = { ...input, price: 200 };
    const fail = await reconstructor.replayAndVerify({ ir, input: corruptedInput, originalTrace });
    if (!fail.isMatched) {
        console.log("✅ Replay Success: Detected data variation (Mismatch confirmed).");
    } else {
        console.error("❌ Replay Failed: System failed to detect data change.");
        process.exit(1);
    }
}

runTest();
