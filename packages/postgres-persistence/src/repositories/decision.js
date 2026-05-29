import { randomUUID } from "node:crypto";

export class DecisionRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async saveDecisionRun({
    domainId,
    profile,
    ruleset,
    decision,
    ownership,
    trust,
    catalogVersion = null,
    publishRunId = null
  }) {
    const decisionRunId = decision.decisionRunId ?? randomUUID();

    // 1. القيد في جدول القرارات الأساسي (Source of Truth)
    await this.pool.query(
      `insert into ml_decision.decision_runs (
        id, domain_id, publish_run_id, catalog_version, profile_payload, logic_version, cards_payload
      ) values ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb)
       on conflict (id) do nothing`,
      [
        decisionRunId,
        domainId,
        publishRunId,
        catalogVersion,
        JSON.stringify(profile),
        ruleset.version || ruleset.logicVersion || "1.0.0",
        JSON.stringify(decision.cards)
      ]
    );

    // 2. القيد في جدول التليمتري (لتحليل المسار لاحقاً)
    await this.pool.query(
      `INSERT INTO ml_telemetry.decision_runs (id, domain_id, profile_id, segment, payload_json)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [
        decisionRunId,
        domainId,
        profile.id ?? decision.profileId ?? "anonymous",
        decision.segment ?? "unknown",
        JSON.stringify({ profile, ruleset, decision, ownership, trust, catalogVersion, publishRunId })
      ]
    );

    // 3. حفظ توصيات الملكية والتدقيقات (الذاكرة المفقودة سابقاً)
    await this.pool.query(
      `insert into ml_decision.ownership_recommendations (
        id, decision_run_id, strategy_payload
      ) values ($1, $2, $3::jsonb)`,
      [randomUUID(), decisionRunId, JSON.stringify(ownership)]
    );

    await this.pool.query(
      `insert into ml_decision.trust_audits (
        id, decision_run_id, audit_payload, audit_ok
      ) values ($1, $2, $3::jsonb, $4)`,
      [randomUUID(), decisionRunId, JSON.stringify(trust), trust.ok]
    );
  }

  async getDecisionTrace(id) {
    const result = await this.pool.query(
      `SELECT id, domain_id, profile_id, segment, payload_json, created_at
       FROM ml_telemetry.decision_runs
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async saveIntervention({ id, decisionRunId, domainId, relaxedConstraint, integrityScore, originalExcludedCount, recoveredCount }) {
    await this.pool.query(
      `INSERT INTO ml_telemetry.interventions
       (id, decision_run_id, domain_id, relaxed_constraint, integrity_score, original_excluded_count, recovered_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id || randomUUID(), decisionRunId, domainId, relaxedConstraint, integrityScore, originalExcludedCount, recoveredCount]
    );
  }

  async getRecentInterventions({ domainId, limit = 20 }) {
    const result = await this.pool.query(
      `SELECT id, decision_run_id, relaxed_constraint, integrity_score, original_excluded_count, recovered_count, created_at
       FROM ml_telemetry.interventions
       WHERE domain_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [domainId, limit]
    );
    return result.rows;
  }

  async getAdminOverview({ domainId }) {
    const countsResult = await this.pool.query(
      `select 'source_observations' as metric, count(*)::int as row_count
       from ml_raw.source_observations
       where domain_id = $1
       union all
       select 'published_entities', count(*)::int
       from ml_catalog.published_entities
       where domain_id = $1
       union all
       select 'decision_runs', count(*)::int
       from ml_decision.decision_runs
       where domain_id = $1
       union all
       select 'user_feedback', count(*)::int
       from ml_telemetry.user_feedback
       union all
       select 'telemetry_clicks', count(*)::int
       from ml_telemetry.telemetry_clicks`,
      [domainId]
    );

    const integrityResult = await this.pool.query(
      `select avg(coalesce(i.integrity_score, 100))::float as avg_integrity
       from ml_decision.decision_runs dr
       left join ml_telemetry.interventions i on dr.id = i.decision_run_id
       where dr.domain_id = $1`,
      [domainId]
    );

    const latestIngestionResult = await this.pool.query(
      `select id, source_count, normalized_count, status, started_at, finished_at
       from ml_raw.ingestion_runs
       where domain_id = $1
       order by started_at desc
       limit 1`,
      [domainId]
    );

    const latestPublishResult = await this.pool.query(
      `select id as publish_run_id, catalog_version, source_observation_count, published_entity_count,
              observation_source, status, created_at, completed_at
       from ml_catalog.publish_runs
       where domain_id = $1
       order by created_at desc
       limit 1`,
      [domainId]
    );

    const latestDecisionResult = await this.pool.query(
      `select id as decision_run_id, catalog_version, publish_run_id, logic_version, created_at
       from ml_decision.decision_runs
       where domain_id = $1
       order by created_at desc
       limit 1`,
      [domainId]
    );

    // Account telemetry (M3 tables — best-effort, may not exist in all envs)
    let accountCounts = { registered_users: 0, saved_decisions: 0, active_price_alerts: 0 };
    try {
      const accountResult = await this.pool.query(
        `SELECT
           (SELECT count(*)::int FROM ml_users.users) AS registered_users,
           (SELECT count(*)::int FROM ml_users.saved_decisions) AS saved_decisions,
           (SELECT count(*)::int FROM ml_users.price_alerts WHERE active = TRUE) AS active_price_alerts`
      );
      if (accountResult.rows[0]) accountCounts = accountResult.rows[0];
    } catch { /* ml_users schema may not exist in older envs — degrade gracefully */ }

    const counts = Object.fromEntries(
      countsResult.rows.map((row) => [row.metric, row.row_count])
    );

    return {
      domainId,
      counts: { ...counts, ...accountCounts },
      avgIntegrity: (integrityResult.rows[0]?.avg_integrity ?? 100) / 100,
      latestIngestionRun: latestIngestionResult.rows[0] ?? null,
      latestPublishRun: latestPublishResult.rows[0] ?? null,
      latestDecisionRun: latestDecisionResult.rows[0] ?? null
    };
  }

  async getLatestDecisionDetails({ domainId }) {
    const decisionResult = await this.pool.query(
      `select id as decision_run_id, catalog_version, publish_run_id, profile_payload, logic_version,
              cards_payload, created_at
       from ml_decision.decision_runs
       where domain_id = $1
       order by created_at desc
       limit 1`,
      [domainId]
    );

    const decision = decisionResult.rows[0] ?? null;
    if (!decision) {
      return null;
    }

    const ownershipResult = await this.pool.query(
      `select strategy_payload
       from ml_decision.ownership_recommendations
       where decision_run_id = $1
       limit 1`,
      [decision.decision_run_id]
    );

    const trustResult = await this.pool.query(
      `select audit_payload, audit_ok
       from ml_decision.trust_audits
       where decision_run_id = $1
       limit 1`,
      [decision.decision_run_id]
    );

    return {
      domainId,
      decisionRunId: decision.decision_run_id,
      catalogVersion: decision.catalog_version,
      publishRunId: decision.publish_run_id,
      logicVersion: decision.logic_version,
      createdAt: decision.created_at,
      profile: decision.profile_payload,
      cards: decision.cards_payload ?? [],
      ownership: ownershipResult.rows[0]?.strategy_payload ?? null,
      trust: trustResult.rows[0]
        ? {
            ok: trustResult.rows[0].audit_ok,
            ...trustResult.rows[0].audit_payload
          }
        : null
    };
  }

  async getDecisionLogic(domainId) {
    const result = await this.pool.query(
      `select config_json, version
       from ml_governance.decision_logic
       where domain_id = $1`,
      [domainId]
    );
    return result.rows[0] || null;
  }

  async saveDecisionLogic(domainId, config) {
    await this.pool.query(
      `insert into ml_governance.decision_logic (domain_id, config_json, version, updated_at)
       values ($1, $2::jsonb, $3, now())
       on conflict (domain_id) do update set
         config_json = excluded.config_json,
         version = excluded.version,
         updated_at = now()`,
      [domainId, JSON.stringify(config), config.version || "1.0.0"]
    );
  }
}
