import { DecisionKernel } from "../../decision-kernel/src/index.js";
import { createHash } from "node:crypto";

/**
 * DecisionReconstructor — Deterministic Replay & Verification Engine.
 * Purpose: Ensure any past decision can be re-executed and verified with 100% fidelity.
 */
export class DecisionReconstructor {
  constructor(options = {}) {
    this.kernel = new DecisionKernel(options.logger || { log: () => {} });
    this.repository = options.repository || null;
  }

  /**
   * Replay a historical decision and verify result match.
   */
  async replayAndVerify({ ir, input, originalTrace }) {
    // 1. Verify IR hash match
    if (ir.irHash !== originalTrace.irHash) {
       throw new Error(`Replay Error: IR Hash mismatch. Expected ${originalTrace.irHash}, got ${ir.irHash}`);
    }

    // 2. Re-execute
    const result = this.kernel.execute(ir, [input]);
    const replayedResult = result.results[0];

    // 3. Deterministic check
    const isMatched = (
        replayedResult.score === (originalTrace.scores[originalTrace.targetScoreId] || originalTrace.scores[Object.keys(originalTrace.scores).pop()]) && 
        replayedResult.eligible === originalTrace.isEligible
    );

    const verification = {
        isMatched,
        replayedTrace: replayedResult.trace,
        verifiedAt: new Date().toISOString(),
        diff: isMatched ? null : {
            expectedScore: originalTrace.score,
            actualScore: replayedResult.score
        }
    };

    // 4. Persist verification result if repository available
    if (this.repository) {
        await this._persistVerification({
            irHash: ir.irHash,
            inputHash: originalTrace.inputHash,
            decisionId: originalTrace.decisionId,
            isMatched,
            verifiedAt: verification.verifiedAt
        });
    }

    return verification;
  }

  /**
   * Record a decision to the governance ledger for future replay.
   */
  async recordDecision({ decisionId, irHash, inputHash, score, eligible }) {
    if (!this.repository) return null;

    const record = {
        decisionId,
        irHash,
        inputHash,
        score,
        eligible,
        recordedAt: new Date().toISOString()
    };

    await this._persistRecord(record);
    return record;
  }

  async _persistVerification(verification) {
    if (!this.repository) return;
    try {
        await this.repository.query(
            `INSERT INTO public.decision_verifications 
             (decision_id, ir_hash, input_hash, is_matched, verified_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (decision_id) DO UPDATE SET is_matched = $4, verified_at = $5`,
            [verification.decisionId, verification.irHash, verification.inputHash, verification.isMatched, verification.verifiedAt]
        );
    } catch (err) {
        // Non-fatal — governance persistence should never block execution
        console.error(`[Governance] Failed to persist verification: ${err.message}`);
    }
  }

  async _persistRecord(record) {
    if (!this.repository) return;
    try {
        await this.repository.query(
            `INSERT INTO public.decision_ledger
             (decision_id, ir_hash, input_hash, score, eligible, recorded_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (decision_id) DO NOTHING`,
            [record.decisionId, record.irHash, record.inputHash, record.score, record.eligible, record.recordedAt]
        );
    } catch (err) {
        console.error(`[Governance] Failed to persist decision record: ${err.message}`);
    }
  }
}
