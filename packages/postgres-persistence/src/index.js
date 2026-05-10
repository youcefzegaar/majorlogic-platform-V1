import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

async function importPg() {
  try {
    return await import("pg");
  } catch (error) {
    throw new Error(
      "The `pg` package is required for Postgres persistence. Run `npm install` in the repository before using DATABASE_URL-backed persistence."
    );
  }
}

function readSql(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export async function createPostgresClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    return null;
  }

  const { Pool } = await importPg();
  const pool = new Pool({
    connectionString,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 60000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  return pool;
}

export class PostgresPlatformRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Helper to execute queries. Uses the pool directly for simple queries,
   * but can be used with a specific client for transactions.
   */
  async query(text, params) {
    return this.pool.query(text, params);
  }

  async shutdown() {
    await this.pool.end();
  }

  async applyMigrations() {
    const migrationFiles = [
      "database/migrations/0001_platform_init.sql",
      "database/migrations/0002_platform_views.sql",
      "database/migrations/0003_catalog_ingestion.sql",
      "database/migrations/0004_catalog_publish_runs.sql",
      "database/migrations/0005_decision_catalog_trace.sql",
      "database/migrations/0006_telemetry.sql",
      "database/migrations/0007_growth_leads.sql",
      "database/migrations/0008_growth_leads_dedup.sql",
      "database/migrations/0009_affiliate_clicks.sql",
      "database/migrations/0010_affiliate_settings.sql",
      "database/migrations/0011_admin_users.sql",
      "database/migrations/0012_admin_users_security.sql",
      "database/migrations/0013_pipeline_orchestration.sql",
      "database/migrations/0014_generic_active_views.sql",
      "database/migrations/0015_external_acquisition_store.sql",
      "database/seeds/0001_domain_registry.sql"
    ];

    console.log(`[Repository] Applying ${migrationFiles.length} migration files...`);
    for (const file of migrationFiles) {
      console.log(`[Repository] Executing ${file}...`);
      await this.pool.query(readSql(file));
    }
    console.log("[Repository] All migrations applied successfully.");
  }

  async saveSourceObservations({ domainId, observations }) {
    console.log(`[Repository] Saving ${observations.length} observations to raw staging...`);
    for (const observation of observations) {
      await this.pool.query(
        `insert into ml_raw.source_observations (
          id, domain_id, source_name, source_url, observation_type, raw_payload, fetched_at
        ) values ($1, $2, $3, $4, $5, $6::jsonb, now())
        on conflict (id) do update set
          raw_payload = excluded.raw_payload,
          fetched_at = excluded.fetched_at`,
        [
          randomUUID(),
          domainId,
          observation.sourceName ?? "seed_source",
          observation.sourceUrl ?? "local://seed",
          observation.observationType ?? "domain_observation",
          JSON.stringify(observation)
        ]
      );
    }
    console.log("[Repository] All observations saved successfully.");
  }

  async getLatestSourceObservations({ domainId, limit = 200 }) {
    const result = await this.pool.query(
      `select raw_payload
       from ml_raw.source_observations
       where domain_id = $1
       order by fetched_at desc
       limit $2`,
      [domainId, limit]
    );

    return result.rows.map((row) => row.raw_payload);
  }

  async getPublishedEntities({ domainId, limit = 500 }) {
    const result = await this.pool.query(
      `select entity_payload
       from ml_catalog.published_entities
       where domain_id = $1
       order by published_at desc
       limit $2`,
      [domainId, limit]
    );

    return result.rows.map((row) => row.entity_payload);
  }

  async getLatestPublishRun({ domainId }) {
    const result = await this.pool.query(
      `select publish_run_id, domain_id, catalog_version, source_observation_count, published_entity_count,
               observation_source, status, created_at, completed_at
       from ml_catalog.active_publish_runs
       where domain_id = $1
       limit 1`,
      [domainId]
    );

    return result.rows[0] ?? null;
  }

  async registerSources({ domainId, sourceRecords }) {
    for (const source of sourceRecords) {
      await this.pool.query(
        `insert into ml_raw.source_registry (
          source_id, domain_id, source_type, source_name, source_url, metadata
        ) values ($1, $2, $3, $4, $5, $6::jsonb)
        on conflict (source_id) do update set
          source_type = excluded.source_type,
          source_name = excluded.source_name,
          source_url = excluded.source_url,
          metadata = excluded.metadata`,
        [
          source.sourceId,
          domainId,
          source.sourceType,
          source.sourceName,
          source.sourceUrl,
          JSON.stringify({
            itemName: source.itemName,
            variantName: source.variantName
          })
        ]
      );
    }
  }

  async createIngestionRun({ domainId, sourceCount }) {
    const runId = randomUUID();
    await this.pool.query(
      `insert into ml_raw.ingestion_runs (
        id, domain_id, source_count, status
      ) values ($1, $2, $3, 'running')`,
      [runId, domainId, sourceCount]
    );
    return runId;
  }

  async completeIngestionRun({ runId, normalizedCount, status = "completed" }) {
    await this.pool.query(
      `update ml_raw.ingestion_runs
       set normalized_count = $2,
           status = $3,
           finished_at = now()
       where id = $1`,
      [runId, normalizedCount, status]
    );
  }

  async createPublishRun({
    domainId,
    catalogVersion,
    sourceObservationCount,
    observationSource
  }) {
    const runId = randomUUID();
    await this.pool.query(
      `insert into ml_catalog.publish_runs (
        id, domain_id, catalog_version, source_observation_count, observation_source, status
      ) values ($1, $2, $3, $4, $5, 'running')`,
      [runId, domainId, catalogVersion, sourceObservationCount, observationSource]
    );
    return runId;
  }

  async completePublishRun({ runId, publishedEntityCount, status = "completed" }) {
    await this.pool.query(
      `update ml_catalog.publish_runs
       set published_entity_count = $2,
           status = $3,
           completed_at = now()
       where id = $1`,
      [runId, publishedEntityCount, status]
    );
  }

  async publishEntities({ domainId, entities, publishRunId = null, catalogVersion = null }) {
    console.log(`[Repository] Publishing ${entities.length} entities to catalog...`);
    for (const entity of entities) {
      // console.log(`[Repository] Publishing entity: ${entity.entityId}`);
      await this.pool.query(
        `insert into ml_catalog.published_entities (
          entity_id, domain_id, publish_run_id, catalog_version, entity_type, title, entity_payload, fit_states, trust, published_at
        ) values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10)
        on conflict (entity_id) do update set
          publish_run_id = excluded.publish_run_id,
          catalog_version = excluded.catalog_version,
          title = excluded.title,
          entity_payload = excluded.entity_payload,
          fit_states = excluded.fit_states,
          trust = excluded.trust,
          published_at = excluded.published_at`,
        [
          entity.entityId,
          domainId,
          publishRunId,
          catalogVersion,
          entity.entityType,
          entity.title,
          JSON.stringify(entity),
          JSON.stringify(entity.fitStates),
          JSON.stringify(entity.trust),
          entity.publishedAt
        ]
      );
    }
    console.log("[Repository] All entities published successfully.");
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
        ruleset.logicVersion,
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

  async saveGrowthArtifacts({ domainId, growth }) {
    if (growth.seoPagePayload) {
      await this.pool.query(
        `insert into ml_growth.page_payloads (
          id, domain_id, surface_type, slug, payload_json
        ) values ($1, $2, $3, $4, $5::jsonb)`,
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
       where domain_id = $1`,
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

    const counts = Object.fromEntries(
      countsResult.rows.map((row) => [row.metric, row.row_count])
    );

    return {
      domainId,
      counts,
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

  async getPublishedEntitySnapshot({ domainId, limit = 8 }) {
    const result = await this.pool.query(
      `select entity_id, title, catalog_version, published_at,
              entity_payload->'economicSignals'->>'resaleScore' as resale_score,
              entity_payload->'market'->'bestOffer'->>'priceUsd' as price_usd,
              entity_payload->'fitStates'->'engineering'->>'state' as engineering_fit,
              entity_payload->'fitStates'->'cs'->>'state' as cs_fit,
              entity_payload->'fitStates'->'design'->>'state' as design_fit,
              entity_payload->'fitStates'->'medical'->>'state' as medical_fit,
              entity_payload->'fitStates'->'general'->>'state' as general_fit
       from ml_catalog.published_entities
       where domain_id = $1
       order by published_at desc, title asc
       limit $2`,
      [domainId, limit]
    );

    return result.rows;
  }

  async saveTelemetryClick({ decisionRunId, entityId, clickType }) {
    await this.pool.query(
      `INSERT INTO ml_telemetry.telemetry_clicks (decision_run_id, entity_id, click_type)
       VALUES ($1, $2, $3)`,
      [decisionRunId, entityId, clickType]
    );
  }

  async saveGrowthLead({ domainId, email, leadType, metadata = {}, optedIn = false }) {
    const result = await this.pool.query(
      `INSERT INTO ml_growth.leads (domain_id, email, lead_type, metadata, opted_in)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (email, domain_id, lead_type) DO UPDATE
         SET metadata = EXCLUDED.metadata, opted_in = EXCLUDED.opted_in
       RETURNING id, created_at, xmax`,
      [domainId, email.toLowerCase().trim(), leadType, JSON.stringify(metadata), optedIn]
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

  // ─────────────────────────────────────────────
  // Affiliate Settings CRUD
  // ─────────────────────────────────────────────

  async getAffiliateSettings() {
    const result = await this.pool.query(
      `SELECT id, seller, seller_display_name, affiliate_tag, affiliate_param_key, is_active, notes, updated_at
       FROM ml_commercial.affiliate_settings
       ORDER BY seller ASC`
    );
    return result.rows;
  }

  async saveAffiliateTag({ seller, affiliateTag, isActive = true, notes = null }) {
    await this.pool.query(
      `INSERT INTO ml_commercial.affiliate_settings
         (seller, affiliate_tag, is_active, notes, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (seller) DO UPDATE SET
         affiliate_tag = EXCLUDED.affiliate_tag,
         is_active     = EXCLUDED.is_active,
         notes         = COALESCE(EXCLUDED.notes, ml_commercial.affiliate_settings.notes),
         updated_at    = now()`,
      [seller, affiliateTag, isActive, notes]
    );
  }

  // Cache affiliate map for the /go/ gateway (refreshed per request, could be cached server-side)
  async getAffiliateTagMap() {
    const rows = await this.getAffiliateSettings();
    const map = {};
    for (const row of rows) {
      if (row.is_active && row.affiliate_tag) {
        map[row.seller] = {
          tag: row.affiliate_tag,
          paramKey: row.affiliate_param_key ?? 'tag'
        };
      }
    }
    return map;
  }

  // ─────────────────────────────────────────────
  // Admin Users
  // ─────────────────────────────────────────────

  async getAdminUser(username) {
    const result = await this.pool.query(
      `SELECT id, username, password_hash, failed_login_attempts, locked_until, last_login_at
       FROM ml_commercial.admin_users WHERE username = $1 LIMIT 1`,
      [username]
    );
    return result.rows[0] || null;
  }

  async createAdminUser(username, passwordHash) {
    await this.pool.query(
      `INSERT INTO ml_commercial.admin_users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
      [username, passwordHash]
    );
  }

  async updateAdminPassword(username, newPasswordHash) {
    await this.pool.query(
      `UPDATE ml_commercial.admin_users SET password_hash = $2, updated_at = now(),
       failed_login_attempts = 0, locked_until = NULL WHERE username = $1`,
      [username, newPasswordHash]
    );
  }

  async updateLoginAttempts(username, attempts, lockedUntil) {
    await this.pool.query(
      `UPDATE ml_commercial.admin_users
       SET failed_login_attempts = $2, locked_until = $3
       WHERE username = $1`,
      [username, attempts, lockedUntil]
    );
  }

  async resetLoginAttempts(username) {
    await this.pool.query(
      `UPDATE ml_commercial.admin_users
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now()
       WHERE username = $1`,
      [username]
    );
  }

  // ─────────────────────────────────────────────
  // Pipeline Orchestration
  // ─────────────────────────────────────────────

  async createPipelineRun({ id, domainId }) {
    await this.pool.query(
      `insert into ml_catalog.pipeline_runs (id, domain_id, status, started_at)
       values ($1, $2, 'running', now())`,
      [id, domainId]
    );
  }

  async updatePipelineRunStatus({ id, status, errorMessage = null }) {
    await this.pool.query(
      `update ml_catalog.pipeline_runs
       set status = $2, error_message = $3, completed_at = case when $2 in ('completed', 'failed') then now() else completed_at end
       where id = $1`,
      [id, status, errorMessage]
    );
  }

  async createPipelineStage({ id, runId, stageName }) {
    await this.pool.query(
      `insert into ml_catalog.pipeline_stages (id, run_id, stage_name, status, started_at)
       values ($1, $2, $3, 'running', now())`,
      [id, runId, stageName]
    );
  }

  async updatePipelineStageStatus({ id, status, metadata = {}, errorMessage = null }) {
    await this.pool.query(
      `update ml_catalog.pipeline_stages
       set status = $2, metadata = metadata || $3::jsonb, error_message = $4, completed_at = case when $2 in ('completed', 'failed') then now() else completed_at end
       where id = $1`,
      [id, status, JSON.stringify(metadata), errorMessage]
    );
  }

  // ─────────────────────────────────────────────
  // External Acquisition
  // ─────────────────────────────────────────────

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

  async saveReviewObservations({ runId, sourceName, productName, rawData, sentimentScore, extractedSignals }) {
    await this.pool.query(
      `INSERT INTO public.external_review_observations
       (run_id, source_name, product_name, raw_data, sentiment_score, extracted_signals)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb)`,
      [runId, sourceName, productName, JSON.stringify(rawData), sentimentScore, JSON.stringify(extractedSignals)]
    );
  }
}
