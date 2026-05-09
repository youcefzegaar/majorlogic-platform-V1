import { randomUUID } from "node:crypto";

/**
 * PipelineManager — مسئول عن تنسيق مراحل معالجة الكتالوج وتتبع تقدمها في قاعدة البيانات.
 */
export class PipelineManager {
  constructor({ repository, domainPack }) {
    this.repository = repository;
    this.domainPack = domainPack;
    this.runId = null;
  }

  /**
   * بدء دورة تنفيذ جديدة.
   */
  async startRun() {
    this.runId = randomUUID();
    console.log(`[Pipeline] Starting run ${this.runId} for domain ${this.domainPack.meta.domainId}`);
    
    if (this.repository) {
      await this.repository.createPipelineRun({
        id: this.runId,
        domainId: this.domainPack.meta.domainId
      });
    }
    
    return this.runId;
  }

  /**
   * تنفيذ مرحلة معينة ضمن الدورة.
   * @param {string} stageName — اسم المرحلة (مثلاً: ingestion, enrichment)
   * @param {Function} stageFn — الدالة التي تنفذ المنطق الفعلي للمرحلة
   */
  async runStage(stageName, stageFn) {
    const stageId = randomUUID();
    console.log(`[Pipeline] [${stageName}] Starting...`);
    
    if (this.repository) {
      await this.repository.createPipelineStage({
        id: stageId,
        runId: this.runId,
        stageName
      });
    }

    try {
      const result = await stageFn();
      
      console.log(`[Pipeline] [${stageName}] Completed successfully.`);
      
      if (this.repository) {
        await this.repository.updatePipelineStageStatus({
          id: stageId,
          status: 'completed',
          metadata: result?.metadata || {}
        });
      }
      
      return result;
    } catch (err) {
      console.error(`[Pipeline] [${stageName}] Failed: ${err.message}`);
      
      if (this.repository) {
        await this.repository.updatePipelineStageStatus({
          id: stageId,
          status: 'failed',
          errorMessage: err.message
        });
      }
      
      throw err;
    }
  }

  /**
   * إنهاء الدورة بنجاح.
   */
  async completeRun() {
    console.log(`[Pipeline] Run ${this.runId} completed.`);
    if (this.repository) {
      await this.repository.updatePipelineRunStatus({
        id: this.runId,
        status: 'completed'
      });
    }
  }

  /**
   * وسم الدورة كفاشلة.
   */
  async failRun(errorMessage) {
    console.error(`[Pipeline] Run ${this.runId} failed: ${errorMessage}`);
    if (this.repository) {
      await this.repository.updatePipelineRunStatus({
        id: this.runId,
        status: 'failed',
        errorMessage
      });
    }
  }
}
