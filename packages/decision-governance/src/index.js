import { DecisionKernel } from "../../decision-kernel/src/index.js";

/**
 * DecisionReconstructor — محرك إعادة بناء القرارات والتحقق من صحتها.
 * الغرض: ضمان أن أي قرار اتخذ في الماضي يمكن إعادة إنتاجه بدقة 100%.
 */
export class DecisionReconstructor {
  constructor(options = {}) {
    this.kernel = new DecisionKernel(options.logger || { log: () => {} });
  }

  /**
   * إعادة تشغيل قرار تاريخي والتحقق من تطابق النتائج.
   * @param {object} params
   * @param {object} params.ir           — نسخة المنطق التاريخية (Decision IR)
   * @param {object} params.input        — لقطة البيانات التاريخية (Input Snapshot)
   * @param {object} params.originalTrace — الأثر الأصلي المسجل للتحقق منه
   */
  async replayAndVerify({ ir, input, originalTrace }) {
    // 1. التحقق من تطابق بصمة المنطق
    if (ir.irHash !== originalTrace.irHash) {
       throw new Error(`Replay Error: IR Hash mismatch. Expected ${originalTrace.irHash}, got ${ir.irHash}`);
    }

    // 2. إعادة التنفيذ
    const result = this.kernel.execute(ir, [input]);
    const replayedResult = result.results[0];

    // 3. التحقق من التطابق التام (Deterministic Check)
    const isMatched = (
        replayedResult.score === (originalTrace.scores[originalTrace.targetScoreId] || originalTrace.scores[Object.keys(originalTrace.scores).pop()]) && 
        replayedResult.eligible === originalTrace.isEligible
    );

    return {
        isMatched,
        replayedTrace: replayedResult.trace,
        diff: isMatched ? null : {
            expectedScore: originalTrace.score,
            actualScore: replayedResult.score
        }
    };
  }
}
