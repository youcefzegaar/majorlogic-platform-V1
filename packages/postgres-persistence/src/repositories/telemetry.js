import { randomUUID } from "node:crypto";

export class TelemetryRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async saveTelemetryClick({ decisionRunId, entityId, clickType }) {
    await this.pool.query(
      `INSERT INTO ml_telemetry.telemetry_clicks (decision_run_id, entity_id, click_type)
       VALUES ($1, $2, $3)`,
      [decisionRunId, entityId, clickType]
    );
  }

  async logAffiliateClick({ domainId, entityId, seller, sellerType, priceUsd, condition, isAffiliate }) {
    await this.pool.query(
      `INSERT INTO ml_telemetry.affiliate_clicks
       (domain_id, entity_id, seller, seller_type, price_usd, condition, is_affiliate)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [domainId, entityId, seller, sellerType ?? null, priceUsd, condition, isAffiliate === true]
    );
  }

  async saveFeedback({ decisionRunId, score, comment = null, tags = null, userId = null }) {
    await this.pool.query(
      `INSERT INTO ml_telemetry.user_feedback (id, decision_run_id, score, comment, tags, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), decisionRunId, score, comment, tags, userId]
    );
  }

  async listFeedback({ limit = 50, offset = 0 } = {}) {
    const result = await this.pool.query(
      `SELECT id, decision_run_id, score, comment, tags, user_id, received_at
       FROM ml_telemetry.user_feedback
       ORDER BY received_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async getUserFeedback(userId) {
    const result = await this.pool.query(
      `SELECT id, decision_run_id, score, comment, tags, received_at
       FROM ml_telemetry.user_feedback
       WHERE user_id = $1
       ORDER BY received_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async deleteUserFeedback(id, userId) {
    const result = await this.pool.query(
      `DELETE FROM ml_telemetry.user_feedback
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rowCount > 0;
  }

  async saveReviewObservations({ runId, sourceName, productName, rawData, sentimentScore, extractedSignals }) {
    await this.pool.query(
      `INSERT INTO public.external_review_observations
       (run_id, source_name, product_name, raw_data, sentiment_score, extracted_signals)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb)`,
      [runId, sourceName, productName, JSON.stringify(rawData), sentimentScore, JSON.stringify(extractedSignals)]
    );
  }

  async createAcquisitionRun({ domainId, metadata = {} }) {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO public.external_acquisition_runs (id, domain_id, status, metadata)
       VALUES ($1, $2, 'running', $3::jsonb)`,
      [id, domainId, JSON.stringify(metadata)]
    );
    return id;
  }

  async completeAcquisitionRun({ id, status = 'completed' }) {
    await this.pool.query(
      `UPDATE public.external_acquisition_runs
       SET status = $2, completed_at = NOW()
       WHERE id = $1`,
      [id, status]
    );
  }
}
