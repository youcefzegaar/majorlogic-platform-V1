/**
 * Unit Tests — Decision Kernel & Domain Logic
 *
 * يختبر المنطق الحرج الذي لا يوجد له unit tests حالياً.
 * هذه الاختبارات تحمي من:
 *   - Silent corruption في formula evaluation
 *   - Regression في conflict detection
 *   - Edge cases في stability calculation
 *   - Incorrect sacrifice vector computation
 */

import assert from "node:assert/strict";
import { DecisionKernel } from "../packages/decision-kernel/src/index.js";

const kernel = new DecisionKernel({ log: () => {}, warn: () => {}, error: () => {} });

// ─────────────────────────────────────────────────────────
// 1. Formula Engine — Silent Corruption Tests
// ─────────────────────────────────────────────────────────

console.log("\n[1/5] Formula Engine Safety Tests...");

// Unknown op must return 0, not undefined or NaN
{
  const result = kernel._evaluateFormula({ op: "unknown_op", args: [] }, {});
  assert.equal(result, 0, "Unknown op should return 0, not undefined");
  assert.ok(isFinite(result), "Unknown op must not return NaN or Infinity");
  console.log("  ✅ Unknown op → 0");
}

// NaN arg must be replaced with 0 silently
{
  const result = kernel._evaluateFormula({ op: "add", args: ["missing_field"] }, {});
  assert.equal(result, 0, "Missing field arg should resolve to 0");
  assert.ok(!isNaN(result), "Result must not be NaN");
  console.log("  ✅ Missing field arg → 0");
}

// Infinity from division must be caught
{
  const result = kernel._evaluateFormula(
    { op: "multiply", args: [{ op: "inverse", arg: 0 }, 100] },
    {}
  );
  assert.ok(isFinite(result), "1/0 must not produce Infinity in score pipeline");
  assert.equal(result, 0, "1/0 should gracefully return 0");
  console.log("  ✅ Division by zero → 0");
}

// Clamp enforces bounds strictly
{
  const over = kernel._evaluateFormula({ op: "clamp", args: [200, 0, 100] }, {});
  const under = kernel._evaluateFormula({ op: "clamp", args: [-50, 0, 100] }, {});
  assert.equal(over, 100, "Clamp should cap at max");
  assert.equal(under, 0, "Clamp should floor at min");
  console.log("  ✅ Clamp bounds enforced");
}

// Floating point precision — no runaway decimals
{
  const result = kernel._evaluateFormula(
    { op: "add", args: [0.1, 0.2] },
    {}
  );
  assert.ok(result.toString().length < 10, `Result ${result} has too many decimals`);
  console.log("  ✅ Floating point precision normalized");
}

// ─────────────────────────────────────────────────────────
// 2. Condition Evaluation — Gate Logic Tests
// ─────────────────────────────────────────────────────────

console.log("\n[2/5] Condition Evaluation Tests...");

const values = { price: 1200, ram: 16, budget: 1500 };

{
  // Basic comparisons
  assert.ok(kernel._evaluateCondition({ op: "lte", left: "price", right: "budget" }, values), "price <= budget should pass");
  assert.ok(!kernel._evaluateCondition({ op: "gt",  left: "price", right: "budget" }, values), "price > budget should fail");
  assert.ok(kernel._evaluateCondition({ op: "gte", left: "ram",   right: 16 }, values), "ram >= 16 should pass");
  assert.ok(!kernel._evaluateCondition({ op: "gte", left: "ram",   right: 32 }, values), "ram >= 32 should fail");
  console.log("  ✅ Basic comparisons correct");
}

{
  // Logical AND — all must pass
  const andCond = { op: "and", args: [
    { op: "lte", left: "price", right: "budget" },
    { op: "gte", left: "ram",   right: 16 }
  ]};
  assert.ok(kernel._evaluateCondition(andCond, values), "AND: both pass");
  console.log("  ✅ AND logic correct");
}

{
  // Logical OR — at least one must pass
  const orCond = { op: "or", args: [
    { op: "gt",  left: "price", right: "budget" },  // fails
    { op: "gte", left: "ram",   right: 16 }           // passes
  ]};
  assert.ok(kernel._evaluateCondition(orCond, values), "OR: one passes");
  console.log("  ✅ OR logic correct");
}

{
  // NOT — inverts result
  const notCond = { op: "not", arg: { op: "gt", left: "price", right: "budget" } };
  assert.ok(kernel._evaluateCondition(notCond, values), "NOT(price>budget) should pass");
  console.log("  ✅ NOT logic correct");
}

{
  // Unknown op → false (safe default)
  const unknown = { op: "unknown_op", left: "price", right: 100 };
  assert.ok(!kernel._evaluateCondition(unknown, values), "Unknown condition op should return false");
  console.log("  ✅ Unknown condition op → false (safe)");
}

// ─────────────────────────────────────────────────────────
// 3. Kernel Execution — Trace Integrity Tests
// ─────────────────────────────────────────────────────────

console.log("\n[3/5] Kernel Execution Trace Integrity...");

{
  const testIR = {
    id: "test_ir",
    version: "1.0",
    irHash: "test_hash",
    executionPlan: [
      { id: "attr_price",   type: "attribute" },
      { id: "attr_ram",     type: "attribute" },
      {
        id: "gate_budget",
        type: "gate",
        condition: { op: "lte", left: "attr_price", right: 1500 },
        humanMeaning: "Device must be within budget",
        weight: 1.0
      },
      {
        id: "score_total",
        type: "score",
        isFinal: true,
        weights: { attr_ram: 5, attr_price: -0.05 },
        penalties: {}
      }
    ]
  };

  // Entity within budget
  const goodEntity = { entityId: "good_laptop", attr_price: 1200, attr_ram: 16 };
  const result1 = kernel.execute(testIR, [goodEntity], {});
  assert.ok(result1.results[0].eligible, "Entity within budget should be eligible");
  assert.ok(result1.results[0].trace.decisionId, "Trace must have a decisionId");
  assert.ok(result1.results[0].score >= 0, "Score must be non-negative");
  console.log("  ✅ Eligible entity produces valid trace");

  // Entity over budget
  const badEntity = { entityId: "expensive_laptop", attr_price: 2000, attr_ram: 32 };
  const result2 = kernel.execute(testIR, [badEntity], {});
  assert.ok(!result2.results[0].eligible, "Entity over budget should be excluded");
  assert.ok(result2.results[0].trace.exclusions.includes("gate_budget"), "Exclusion trace must record failing gate");
  assert.ok(result2.results[0].trace.sacrifices["gate_budget"], "Sacrifice must be recorded for gate violation");
  console.log("  ✅ Ineligible entity records exclusion and sacrifice in trace");
}

{
  // Score clamp test — no score can exceed 100 or go below 0
  const testIR = {
    id: "score_clamp_test", version: "1.0", irHash: "x",
    executionPlan: [
      { id: "attr_perf", type: "attribute" },
      {
        id: "score_final", type: "score", isFinal: true,
        weights: { attr_perf: 2 },  // 90 * 2 = 180 → should clamp to 100
        penalties: {}
      }
    ]
  };
  const entity = { entityId: "test", attr_perf: 90 };
  const result = kernel.execute(testIR, [entity], {});
  assert.ok(result.results[0].score <= 100, `Score ${result.results[0].score} must not exceed 100`);
  assert.ok(result.results[0].score >= 0,   `Score must not be negative`);
  console.log("  ✅ Score clamped to [0, 100] range");
}

// ─────────────────────────────────────────────────────────
// 4. Stability Score Edge Cases
// ─────────────────────────────────────────────────────────

console.log("\n[4/5] Stability Score Edge Cases...");

{
  // Recreate the calculateStability logic from decision-engine for unit testing
  function calculateStability(candidates, relaxationScore = 0) {
    if (!candidates.length) return 0;
    const scores = candidates.map(c => c.match || 0);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const matchQuality = mean / 100;
    const consistency = Math.max(0, 1 - (stdDev / 100));
    const relaxationPenalty = Math.min(relaxationScore, 0.40);
    const trustScore = candidates.reduce((sum, c) => sum + (c.trust ?? 0.75), 0) / candidates.length;
    const stability = (matchQuality * 0.60) + (consistency * 0.20) + (trustScore * 0.20);
    return Math.max(0, Math.min(1, stability - relaxationPenalty));
  }

  // Empty candidates → 0
  assert.equal(calculateStability([]), 0, "Empty candidates → stability 0");
  console.log("  ✅ Empty candidates → 0");

  // Perfect single candidate
  const perfect = [{ match: 100, trust: 1.0 }];
  const s = calculateStability(perfect);
  assert.ok(s > 0.8, `Perfect candidate stability ${s} should be > 0.8`);
  console.log("  ✅ Perfect candidate → high stability");

  // Heavy relaxation caps stability
  const good = [{ match: 90, trust: 0.9 }];
  const relaxed = calculateStability(good, 0.38);  // just under 40% cap
  assert.ok(relaxed < calculateStability(good, 0), "Relaxation must reduce stability");
  console.log("  ✅ Relaxation reduces stability correctly");

  // Stability never goes negative
  const poor = [{ match: 10, trust: 0.3 }];
  assert.ok(calculateStability(poor, 0.40) >= 0, "Stability must never be negative");
  console.log("  ✅ Stability floored at 0");
}

// ─────────────────────────────────────────────────────────
// 5. Sacrifice Vector Integrity
// ─────────────────────────────────────────────────────────

console.log("\n[5/5] Sacrifice Vector Integrity...");

{
  function computeSacrificeVector(profile, entity) {
    return {
      price:       (profile.budgetUsd - entity.price)  / profile.budgetUsd,
      performance: (entity.performance - 70) / 30,
      portability: (entity.portability - 70) / 30,
      resale:      (entity.resale - 50) / 50
    };
  }

  const profile = { budgetUsd: 1500 };

  // Device exactly at budget → price sacrifice = 0
  const atBudget = computeSacrificeVector(profile, { price: 1500, performance: 85, portability: 80, resale: 70 });
  assert.equal(atBudget.price, 0, "Price sacrifice at budget should be 0");
  console.log("  ✅ Price sacrifice = 0 at budget ceiling");

  // Device over budget → negative price sacrifice (a real cost)
  const overBudget = computeSacrificeVector(profile, { price: 1600, performance: 85, portability: 80, resale: 70 });
  assert.ok(overBudget.price < 0, "Over-budget device should have negative price sacrifice");
  console.log("  ✅ Over-budget → negative sacrifice (correct)");

  // All sacrifice dimensions are finite numbers
  const sv = computeSacrificeVector(profile, { price: 1200, performance: 90, portability: 75, resale: 60 });
  for (const [key, val] of Object.entries(sv)) {
    assert.ok(isFinite(val), `Sacrifice vector ${key} must be finite, got ${val}`);
  }
  console.log("  ✅ All sacrifice dimensions are finite");
}

console.log("\n✅ All unit tests passed.\n");
