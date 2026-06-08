import { randomUUID } from "node:crypto";

export class GrowthRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async saveGrowthArtifacts({ domainId, growth }) {
    if (growth.seoPagePayload) {
      await this.pool.query(
        `insert into ml_growth.page_payloads (
          id, domain_id, surface_type, slug, payload_json
        ) values ($1, $2, $3, $4, $5::jsonb)
        on conflict (domain_id, slug) do update set
          payload_json = excluded.payload_json,
          generated_at = now()`,
        [
          randomUUID(),
          domainId,
          "seo_page",
          growth.seoPagePayload.slug,
          JSON.stringify(growth.seoPagePayload)
        ]
      );
    }

    if (growth.shareArtifact) {
      await this.pool.query(
        `insert into ml_growth.share_artifacts (
          id, domain_id, artifact_type, artifact_payload
        ) values ($1, $2, $3, $4::jsonb)`,
        [
          randomUUID(),
          domainId,
          growth.shareArtifact.type,
          JSON.stringify(growth.shareArtifact)
        ]
      );
    }
  }

  async saveGrowthLead({ domainId, email, leadType, metadata = {}, optedIn = false, decisionRunId = null }) {
    const result = await this.pool.query(
      `INSERT INTO ml_growth.leads (domain_id, email, lead_type, metadata, opted_in, decision_run_id)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       ON CONFLICT (email, domain_id, lead_type) DO UPDATE
         SET metadata = EXCLUDED.metadata, opted_in = EXCLUDED.opted_in,
             decision_run_id = COALESCE(EXCLUDED.decision_run_id, ml_growth.leads.decision_run_id)
       RETURNING id, created_at, xmax`,
      [domainId, email.toLowerCase().trim(), leadType, JSON.stringify(metadata), optedIn, decisionRunId ?? null]
    );
    const row = result.rows[0];
    // xmax=0 means it was a fresh INSERT (not an update)
    return { id: row.id, created_at: row.created_at, isDuplicate: row.xmax !== "0" };
  }

  async getGrowthLeads({ domainId, leadType = null, limit = 500 }) {
    const typeFilter = leadType ? "AND lead_type = $3" : "";
    const params = leadType ? [domainId, limit, leadType] : [domainId, limit];
    const result = await this.pool.query(
      `SELECT id, email, lead_type, metadata, opted_in, created_at
       FROM ml_growth.leads
       WHERE domain_id = $1 ${typeFilter}
       ORDER BY created_at DESC
       LIMIT $2`,
      params
    );
    return result.rows;
  }

  async getGrowthLeadsFiltered({ domainId, leadType, optedIn, search, from, to, limit = 100, offset = 0 }) {
    const conditions = ["domain_id = $1"];
    const params = [domainId];
    let idx = 2;

    if (leadType) { conditions.push(`lead_type = $${idx++}`); params.push(leadType); }
    if (optedIn != null) { conditions.push(`opted_in = $${idx++}`); params.push(optedIn); }
    if (search) { conditions.push(`email ILIKE $${idx++}`); params.push(`%${search}%`); }
    if (from) { conditions.push(`created_at >= $${idx++}`); params.push(from); }
    if (to) { conditions.push(`created_at <= $${idx++}`); params.push(to); }

    const where = conditions.join(" AND ");
    const [dataResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT id, email, lead_type, metadata, opted_in, created_at
         FROM ml_growth.leads WHERE ${where}
         ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
        [...params, limit, offset]
      ),
      this.pool.query(`SELECT COUNT(*) as total FROM ml_growth.leads WHERE ${where}`, params)
    ]);

    return { rows: dataResult.rows, total: parseInt(countResult.rows[0].total) };
  }

  async getLeadStats({ domainId }) {
    const result = await this.pool.query(
      `SELECT
        lead_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE opted_in = true) as opted_in_count,
        MAX(created_at) as latest_at
       FROM ml_growth.leads
       WHERE domain_id = $1
       GROUP BY lead_type
       ORDER BY total DESC`,
      [domainId]
    );
    return result.rows;
  }

  async saveGuardrailEvents({ domainId, governance }) {
    if (governance.ok) {
      return;
    }

    for (const violation of governance.violations) {
      await this.pool.query(
        `insert into ml_governance.guardrail_events (
          id, domain_id, layer_name, event_type, details
        ) values ($1, $2, $3, $4, $5::jsonb)`,
        [
          randomUUID(),
          domainId,
          "strategic_governance",
          "violation",
          JSON.stringify({ violation })
        ]
      );
    }
  }

  async getGuardrailEvents({ domainId, limit = 50 }) {
    const result = await this.pool.query(
      `SELECT id, domain_id, layer_name, event_type, details, created_at
       FROM ml_governance.guardrail_events
       WHERE domain_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [domainId, limit]
    );
    return result.rows;
  }

  // ── Price alert helpers ───────────────────────────────────────────────────────

  async getAllPriceAlertLeads() {
    const result = await this.pool.query(
      `SELECT id, email, domain_id, metadata
       FROM ml_growth.leads
       WHERE lead_type = 'price_alert'
       ORDER BY created_at ASC`
    );
    return result.rows;
  }

  async updateLeadMetadata({ leadId, metadata }) {
    await this.pool.query(
      `UPDATE ml_growth.leads SET metadata = $2::jsonb WHERE id = $1`,
      [leadId, JSON.stringify(metadata)]
    );
  }

  // ── Nurture email helpers ─────────────────────────────────────────────────────

  async getLeadsForNurtureDay(sequenceDay) {
    const windowMap = { 1: [0, 2], 3: [2, 4], 7: [6, 9], 30: [28, 33] };
    if (!windowMap[sequenceDay]) throw new Error(`Invalid sequenceDay: ${sequenceDay}`);
    const [minDays, maxDays] = windowMap[sequenceDay];
    const result = await this.pool.query(
      `SELECT l.id, l.email, l.domain_id, l.metadata, l.created_at
       FROM ml_growth.leads l
       WHERE l.created_at >= NOW() - ($1 * INTERVAL '1 day')
         AND l.created_at <  NOW() - ($2 * INTERVAL '1 day')
         AND NOT EXISTS (
           SELECT 1 FROM ml_growth.nurture_emails n
           WHERE n.lead_id = l.id AND n.sequence_day = $3
         )
       ORDER BY l.created_at ASC
       LIMIT 500`,
      [maxDays, minDays, sequenceDay]
    );
    return result.rows;
  }

  async recordNurtureEmail({ leadId, email, sequenceDay }) {
    await this.pool.query(
      `INSERT INTO ml_growth.nurture_emails (lead_id, email, sequence_day)
       VALUES ($1, $2, $3)
       ON CONFLICT (lead_id, sequence_day) DO NOTHING`,
      [leadId, email, sequenceDay]
    );
  }

  // ── Integrity certificates ────────────────────────────────────────────────────

  async getSacrificeGuardForRun(decisionRunId) {
    const result = await this.pool.query(
      `SELECT guards_json->'sacrifice'->>'passed' AS sacrifice_passed
       FROM ml_governance.integrity_certificates
       WHERE decision_run_id = $1
       LIMIT 1`,
      [decisionRunId]
    );
    const raw = result.rows[0]?.sacrifice_passed;
    if (raw == null) return null;
    return raw === 'true';
  }

  async saveCertificate({ decisionRunId, overallPassed, integrityScore, guardsMap }) {
    await this.pool.query(
      `INSERT INTO ml_governance.integrity_certificates
         (decision_run_id, overall_passed, integrity_score, guards_json)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [decisionRunId, overallPassed, integrityScore, JSON.stringify(guardsMap)]
    );
  }

  async getCertificateStats({ sinceDays = 7 } = {}) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*)::int AS certificate_count,
         ROUND(AVG(integrity_score), 1)::float AS avg_integrity_score,
         COUNT(*) FILTER (WHERE overall_passed = true)::int AS passed_count,
         ROUND(
           AVG(ABS(
             (guards_json->'money-separation'->'evidence'->>'spearmanCorrelation')::float
           )) * 100, 1
         )::float AS avg_spearman_pct,
         ROUND(
           (1 - AVG(ABS(
             (guards_json->'money-separation'->'evidence'->>'spearmanCorrelation')::float
           ))) * 100, 1
         )::float AS money_blindness_score
       FROM ml_governance.integrity_certificates
       WHERE evaluated_at >= NOW() - ($1 * INTERVAL '1 day')`,
      [sinceDays]
    );
    return result.rows[0] ?? {
      certificate_count: 0,
      avg_integrity_score: null,
      passed_count: 0,
      avg_spearman_pct: null,
      money_blindness_score: null,
    };
  }

  async saveRegretAnswer({ decisionRunId, domainId, answer, sacrificeShown = null }) {
    await this.pool.query(
      `INSERT INTO ml_telemetry.regret_answers
         (decision_run_id, domain_id, answer, sacrifice_shown)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (decision_run_id) DO NOTHING`,
      [decisionRunId, domainId, answer, sacrificeShown]
    );
  }

  async getRegretStats({ domainId, sinceDays = 30 } = {}) {
    const result = await this.pool.query(
      `SELECT
         answer,
         sacrifice_shown,
         COUNT(*)::int AS count
       FROM ml_telemetry.regret_answers
       WHERE domain_id = $1
         AND received_at >= NOW() - ($2 * INTERVAL '1 day')
       GROUP BY answer, sacrifice_shown
       ORDER BY sacrifice_shown, answer`,
      [domainId, sinceDays]
    );
    return result.rows;
  }

  async saveDeterminismProbe({ domainId, decisionRunId, irHash, topCardEntityId, topCardScore }) {
    await this.pool.query(
      `INSERT INTO ml_governance.guardrail_events
         (id, domain_id, layer_name, event_type, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        randomUUID(),
        domainId,
        'decision_governance',
        'determinism_probe',
        JSON.stringify({ decisionRunId, irHash, topCardEntityId, topCardScore, sampledAt: new Date().toISOString() }),
      ]
    );
  }
}
