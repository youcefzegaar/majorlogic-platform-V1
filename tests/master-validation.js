/**
 * MASTER VALIDATION SUITE v2 — Tests ALL layers, both production and VM paths.
 */
import { DecisionCompiler } from "../packages/decision-compiler/src/index.js";
import { DecisionKernel } from "../packages/decision-kernel/src/index.js";
import { DecisionReconstructor } from "../packages/decision-governance/src/index.js";
import { AcquisitionManager, RedditExtractor } from "../packages/catalog-acquisition/src/index.js";
import { classifyReviewSignals, computeReviewRisk, produceReviewIntelligence, computeBayesianConfidence, detectFatalPatterns } from "../packages/catalog-review-intelligence/src/index.js";
import { IdentityManager, resolveConflicts } from "../packages/catalog-identity/src/index.js";
import { DecisionExplainer } from "../packages/decision-explanation/src/index.js";

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ ${name}: ${err.message}`);
        failed++;
    }
}

function assert(condition, msg) { if (!condition) throw new Error(msg); }

async function main() {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  MAJORLOGIC V1 — COMPREHENSIVE SYSTEM VALIDATION ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    // ═══════════════════════════════════════════
    // LAYER 1: Decision Compiler
    // ═══════════════════════════════════════════
    console.log("── Layer 1: Decision Compiler ──");

    await test("Compiles a valid config and produces IR hash", async () => {
        const compiler = new DecisionCompiler({ log: () => {} });
        const ir = compiler.compile({
            domainId: "test",
            attributes: { "price": { type: "numeric", dataType: "currency" } },
            metrics: { "tax": { formula: { op: "multiply", args: ["price", 0.1] } } }
        });
        assert(ir.irHash && ir.irHash.length === 64, "IR hash must be 64 chars (SHA-256)");
        assert(ir.executionPlan.length === 2, "Plan should have 2 nodes (price + tax)");
    });

    await test("Detects circular dependencies", async () => {
        const compiler = new DecisionCompiler({ log: () => {} });
        let caught = false;
        try {
            compiler.compile({
                domainId: "cycle-test",
                metrics: {
                    "a": { formula: { op: "add", args: ["b", 1] } },
                    "b": { formula: { op: "add", args: ["a", 1] } }
                }
            });
        } catch (e) { caught = e.message.includes("Cycle"); }
        assert(caught, "Should throw cycle detection error");
    });

    await test("Rejects incompatible type operations", async () => {
        const compiler = new DecisionCompiler({ log: () => {} });
        let caught = false;
        try {
            compiler.compile({
                domainId: "type-test",
                attributes: {
                    "price": { type: "numeric", dataType: "currency" },
                    "score": { type: "numeric", dataType: "score" }
                },
                gates: { "bad_gate": { condition: { op: "gte", left: "price", right: "score" } } }
            });
        } catch (e) { caught = e.message.includes("CONTRACT VIOLATION"); }
        assert(caught, "Should reject currency vs score comparison");
    });

    await test("Does NOT duplicate gate nodes", async () => {
        const compiler = new DecisionCompiler({ log: () => {} });
        const ir = compiler.compile({
            domainId: "dup-test",
            attributes: { "val": { type: "numeric" } },
            gates: { "g1": { condition: { op: "gte", left: "val", right: 10 } } }
        });
        const gateNodes = ir.executionPlan.filter(n => n.type === "gate");
        assert(gateNodes.length === 1, `Expected 1 gate, got ${gateNodes.length}`);
    });

    // ═══════════════════════════════════════════
    // LAYER 2: Decision Kernel (VM)
    // ═══════════════════════════════════════════
    console.log("\n── Layer 2: Decision Kernel ──");

    await test("Executes arithmetic with numeric literals", async () => {
        const compiler = new DecisionCompiler({ log: () => {} });
        const kernel = new DecisionKernel({ log: () => {} });
        const ir = compiler.compile({
            domainId: "math-test",
            attributes: { "base": { type: "numeric" } },
            metrics: { "result": { formula: { op: "multiply", args: ["base", 0.5] } } }
        });
        const exec = kernel.execute(ir, [{ base: 200 }]);
        assert(exec.results[0].trace.scores.result === 100, "200 * 0.5 should = 100");
    });

    await test("Generates unique deterministic decisionId per entity", async () => {
        const compiler = new DecisionCompiler({ log: () => {} });
        const kernel = new DecisionKernel({ log: () => {} });
        const ir = compiler.compile({ domainId: "id-test", metrics: { "v": { formula: { op: "add", args: [1, 2] } } } });
        const exec = kernel.execute(ir, [{ id: "a" }, { id: "b" }]);
        assert(exec.results[0].trace.decisionId !== exec.results[1].trace.decisionId, "Different entities must have different decisionIds");
    });

    // ═══════════════════════════════════════════
    // LAYER 3: Decision Governance
    // ═══════════════════════════════════════════
    console.log("\n── Layer 3: Decision Governance ──");

    await test("Replays a decision and verifies deterministic match", async () => {
        const compiler = new DecisionCompiler({ log: () => {} });
        const kernel = new DecisionKernel({ log: () => {} });
        const ir = compiler.compile({
            domainId: "replay-test",
            metrics: { "s": { formula: { op: "add", args: [10, 20] } } },
            scores: { "final": { weights: { "s": 1 }, isFinal: true } }
        });
        const entity = { id: "e1" };
        const original = kernel.execute(ir, [entity]).results[0];

        const reconstructor = new DecisionReconstructor();
        const verification = await reconstructor.replayAndVerify({ ir, input: entity, originalTrace: original.trace });
        assert(verification.isMatched, "Replay must match original execution");
    });

    // ═══════════════════════════════════════════
    // LAYER 4: Review Intelligence (Unified)
    // ═══════════════════════════════════════════
    console.log("\n── Layer 4: Review Intelligence ──");

    await test("Classifies known review signals correctly", async () => {
        const signals = classifyReviewSignals(["battery_below_expectation", "unknown_signal"]);
        assert(signals[0].category === "battery", "Should classify battery signal");
        assert(signals[1].category === "unknown", "Unknown should be 'unknown'");
    });

    await test("Computes composite review risk", async () => {
        const classified = classifyReviewSignals(["battery_below_expectation", "runs_hot_under_load"]);
        const risk = computeReviewRisk({ classifiedSignals: classified, rawRiskScore: 0.3 });
        assert(risk.compositeRisk > 0 && risk.compositeRisk <= 1, "Risk must be 0-1");
        assert(["low", "medium", "high"].includes(risk.riskLevel), "Must have a valid risk level");
    });

    await test("Bayesian confidence scoring is integrated", async () => {
        const result = produceReviewIntelligence({
            topCons: ["battery_below_expectation"],
            reviewRiskScore: 0.3,
            reviewCount: 5
        });
        assert(result.bayesianScore !== undefined, "Must include bayesianScore");
        assert(result.confidenceLevel === "low", "5 reviews should be low confidence");
    });

    await test("Bayesian scoring penalizes low-sample products", async () => {
        const low = computeBayesianConfidence({ reviewCount: 2, rawRiskScore: 1.0 });
        const high = computeBayesianConfidence({ reviewCount: 500, rawRiskScore: 0.8 });
        assert(high.weightedScore > low.weightedScore, "High sample size should have better score");
    });

    await test("Detects fatal recurring flaw patterns", async () => {
        const risks = detectFatalPatterns({ "battery": { negativeCount: 25 } }, 100);
        assert(risks.length === 1, "Should detect 1 fatal pattern");
        assert(risks[0].severity === "critical", "Should be critical");
    });

    // ═══════════════════════════════════════════
    // LAYER 5: Identity Manager
    // ═══════════════════════════════════════════
    console.log("\n── Layer 5: Identity Manager ──");

    await test("Merges duplicate observations into single entity", async () => {
        const manager = new IdentityManager({ logger: { log: () => {} } });
        const result = manager.resolve([
            { itemName: "ThinkPad X1", specs: { brand: "lenovo", ramGb: 16, storageGb: 512, cpu: "i7" } },
            { itemName: "ThinkPad X1", specs: { brand: "lenovo", ramGb: 16, storageGb: 512, cpu: "i7" } }
        ]);
        assert(result.stats.unique === 1, "Should merge into 1 entity");
        assert(result.stats.collapsed === 1, "Should collapse 1 duplicate");
    });

    // ═══════════════════════════════════════════
    // LAYER 6: Decision Explainer
    // ═══════════════════════════════════════════
    console.log("\n── Layer 6: Decision Explainer ──");

    await test("Explains rejection with readable reasons", async () => {
        const explainer = new DecisionExplainer({ locale: "en" });
        const story = explainer.explain({ isEligible: false, exclusions: ["within_budget"], scores: {} }, "Test Laptop");
        assert(story.includes("excluded"), "Should contain 'excluded'");
        assert(story.includes("user budget"), "Should map 'within_budget' to human term");
    });

    await test("Explains winner with top strength", async () => {
        const explainer = new DecisionExplainer({ locale: "en" });
        const story = explainer.explain({
            isEligible: true,
            exclusions: [],
            scores: { score_general: 85, score_computer_science: 72 },
            steps: []
        }, "MacBook Pro");
        assert(story.includes("chosen"), "Should contain 'chosen'");
    });

    // ═══════════════════════════════════════════
    // LAYER 7: Acquisition
    // ═══════════════════════════════════════════
    console.log("\n── Layer 7: Acquisition ──");

    await test("Orchestrates multiple extractors", async () => {
        const manager = new AcquisitionManager({ log: () => {}, error: () => {} });
        manager.registerExtractor("reddit", new RedditExtractor());
        const data = await manager.fetchReviews("Test Product");
        assert(data.reddit && data.reddit.source === "reddit", "Reddit data must be present");
    });

    await test("Persists acquisition results via repository", async () => {
        const calls = [];
        const mockRepo = {
            createAcquisitionRun: async () => { calls.push("create"); return "run-1"; },
            saveReviewObservations: async () => { calls.push("save"); },
            completeAcquisitionRun: async () => { calls.push("complete"); }
        };
        const manager = new AcquisitionManager({ log: () => {}, error: () => {} });
        manager.registerExtractor("reddit", new RedditExtractor());
        await manager.fetchReviews("X", { repository: mockRepo, domainId: "test" });
        assert(calls.join(",") === "create,save,complete", "Must call create→save→complete");
    });

    // ═══════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log(`║  Results: ${passed} passed, ${failed} failed${" ".repeat(Math.max(0, 24 - String(passed + failed).length))}║`);
    console.log(`║  Status:  ${failed === 0 ? "ALL SYSTEMS OPERATIONAL ✅" : "FAILURES DETECTED ❌"}       ║`);
    console.log("╚══════════════════════════════════════════════════╝");

    if (failed > 0) process.exit(1);
}

main().catch(err => {
    console.error("Suite crashed:", err);
    process.exit(1);
});
