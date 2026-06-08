// S2: determinism guard must return status:"not_verified" (not passed:true) when not sampled.
import { describe, it, expect } from "vitest";
import { runAll } from "../packages/governance-evaluator/src/index.js";

const minDecision = {
  cards: [{ cardType: "hero", entityId: "x", score: 80, trace: { irHash: "abc" } }],
  status: "ok",
  intentId: "general",
  evaluatedCount: 10,
  candidateCount: 5,
};
const minCtx = { governance: { ok: true, violations: [], warnings: [] } };

describe("S2 — determinism guard", () => {
  it("non-sampled decision: determinism.status === 'not_verified', not passed", () => {
    const cert = runAll(minDecision, null, minCtx); // no determinismProbe
    const det = cert.guardsMap["determinism"];
    expect(det.status).toBe("not_verified");
    expect(det.passed).toBe(false);
  });

  it("non-sampled does NOT fail overallPassed (neutral, not a failure)", () => {
    const cert = runAll(minDecision, null, minCtx);
    // overallPassed can only be false because of OTHER guards (sacrifice etc),
    // not because determinism is not_verified.
    const det = cert.guardsMap["determinism"];
    expect(det.status).toBe("not_verified");
    // Confirm overallPassed is not degraded solely by not_verified determinism
    const otherGuardsFailed = Object.entries(cert.guardsMap)
      .filter(([k]) => k !== "determinism")
      .some(([, g]) => !g.passed);
    expect(cert.overallPassed).toBe(!otherGuardsFailed);
  });

  it("sampled + irHash present: status === 'verified', passed", () => {
    const ctx = {
      ...minCtx,
      determinismProbe: { sampled: true, irHashPresent: true, irHash: "abc123" },
    };
    const cert = runAll(minDecision, null, ctx);
    const det = cert.guardsMap["determinism"];
    expect(det.status).toBe("verified");
    expect(det.passed).toBe(true);
  });
});
