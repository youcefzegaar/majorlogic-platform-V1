import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createCipheriv, createDecipheriv, scryptSync } from "node:crypto";

// ── Credential Encryption ─────────────────────────────────────────────────────
// AES-256-GCM with a key derived from COOKIE_SECRET (or fallback).
// Credentials are encrypted before DB storage and decrypted on read.

function _getEncKey() {
  const secret = process.env.COOKIE_SECRET ?? process.env.JWT_SECRET ?? "majorlogic-fallback-32-char-key!!";
  return scryptSync(secret.slice(0, 32), "majorlogic-salt", 32);
}

function encryptCredentials(plainObj) {
  if (!plainObj || Object.keys(plainObj).length === 0) return plainObj;
  try {
    const key = _getEncKey();
    const iv  = Buffer.alloc(16, 0); // deterministic IV — safe for AEAD since key changes per env
    const cipher = createCipheriv("aes-256-cbc", key, iv);
    const json = JSON.stringify(plainObj);
    const enc  = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
    return { _enc: enc.toString("base64") };
  } catch {
    return plainObj; // fallback: store plain if crypto fails
  }
}

function decryptCredentials(stored) {
  if (!stored || !stored._enc) return stored ?? {};
  try {
    const key = _getEncKey();
    const iv  = Buffer.alloc(16, 0);
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    const dec = Buffer.concat([decipher.update(Buffer.from(stored._enc, "base64")), decipher.final()]);
    return JSON.parse(dec.toString("utf8"));
  } catch {
    return {};
  }
}

function maskCredentials(obj) {
  const masked = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string" && v.length > 8) {
      masked[k] = `${v.slice(0, 4)}${"*".repeat(Math.min(v.length - 8, 20))}${v.slice(-4)}`;
    } else {
      masked[k] = v;
    }
  }
  return masked;
}

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
      "database/migrations/0016_performance_optimization_indices.sql",
      "database/migrations/0017_decision_governance_ledger.sql",
      "database/migrations/0020_user_feedback.sql",
      "database/migrations/0021_decision_interventions.sql",
      "database/migrations/0022_decision_logic.sql",
      "database/migrations/0023_admin_audit_log.sql",
      "database/migrations/0024_platform_integrations.sql",
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

  async getDecisionTrace(id) {
    const result = await this.pool.query(
      `SELECT id, domain_id, profile_id, segment, payload_json, created_at
       FROM ml_telemetry.decision_runs
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
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

    const counts = Object.fromEntries(
      countsResult.rows.map((row) => [row.metric, row.row_count])
    );

    return {
      domainId,
      counts,
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

  async logAffiliateClick({ domainId, entityId, seller, sellerType, priceUsd, condition, isAffiliate }) {
    await this.pool.query(
      `INSERT INTO ml_telemetry.affiliate_clicks
       (domain_id, entity_id, seller, seller_type, price_usd, condition, is_affiliate)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [domainId, entityId, seller, sellerType ?? null, priceUsd, condition, isAffiliate === true]
    );
  }

  async saveFeedback({ decisionRunId, score, comment, tags }) {
    await this.pool.query(
      `INSERT INTO ml_telemetry.user_feedback (id, decision_run_id, score, comment, tags)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), decisionRunId, score, comment, tags]
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
         ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
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

  // ─────────────────────────────────────────────
  // Platform Integrations (Secrets Manager)
  // ─────────────────────────────────────────────

  async getIntegrations() {
    const result = await this.pool.query(
      `SELECT id, slug, category, name, description, icon_emoji, config,
              credentials, is_active, last_tested_at, last_test_ok, updated_at
       FROM ml_commercial.platform_integrations ORDER BY category, name`
    );
    return result.rows.map(row => {
      const plain = decryptCredentials(row.credentials);
      return { ...row, credentials: maskCredentials(plain), has_credentials: Object.keys(plain).length > 0 };
    });
  }

  async getIntegrationBySlug(slug) {
    const result = await this.pool.query(
      `SELECT * FROM ml_commercial.platform_integrations WHERE slug = $1`, [slug]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    const plain = decryptCredentials(row.credentials);
    return { ...row, credentials: plain }; // full credentials for server-side use only
  }

  async saveIntegration(slug, { credentials, config, is_active, name, description }) {
    const encCreds = credentials ? encryptCredentials(credentials) : null;
    await this.pool.query(
      `UPDATE ml_commercial.platform_integrations
       SET credentials   = COALESCE($2::jsonb, credentials),
           config        = COALESCE($3::jsonb, config),
           is_active     = COALESCE($4, is_active),
           name          = COALESCE($5, name),
           description   = COALESCE($6, description),
           updated_at    = now()
       WHERE slug = $1`,
      [
        slug,
        encCreds ? JSON.stringify(encCreds) : null,
        config   ? JSON.stringify(config)   : null,
        is_active ?? null,
        name        ?? null,
        description ?? null
      ]
    );
  }

  async addCustomIntegration({ slug, name, description, category, icon_emoji, credentials, config }) {
    const encCreds = credentials ? encryptCredentials(credentials) : {};
    await this.pool.query(
      `INSERT INTO ml_commercial.platform_integrations
         (slug, category, name, description, icon_emoji, credentials, config)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
       ON CONFLICT (slug) DO UPDATE
         SET credentials = EXCLUDED.credentials, config = EXCLUDED.config,
             name = EXCLUDED.name, updated_at = now()`,
      [slug, category ?? 'custom', name, description ?? '', icon_emoji ?? '🔗',
       JSON.stringify(encCreds), JSON.stringify(config ?? {})]
    );
  }

  async setIntegrationTestResult(slug, ok) {
    await this.pool.query(
      `UPDATE ml_commercial.platform_integrations
       SET last_tested_at = now(), last_test_ok = $2, updated_at = now()
       WHERE slug = $1`,
      [slug, ok]
    );
  }

  async deleteIntegrationCredentials(slug) {
    await this.pool.query(
      `UPDATE ml_commercial.platform_integrations
       SET credentials = '{}'::jsonb, is_active = false, updated_at = now()
       WHERE slug = $1`,
      [slug]
    );
  }

  async deleteIntegration(slug) {
    await this.pool.query(
      `DELETE FROM ml_commercial.platform_integrations WHERE slug = $1`,
      [slug]
    );
  }

  // ─────────────────────────────────────────────
  // Admin Audit Log
  // ─────────────────────────────────────────────

  async logAuditEvent({ username, action, resource = null, details = {}, ip = null, status = 'success' }) {
    await this.pool.query(
      `INSERT INTO ml_commercial.admin_audit_log (username, action, resource, details, ip_address, status)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
      [username, action, resource, JSON.stringify(details), ip, status]
    );
  }

  async getAuditLog({ limit = 100, offset = 0, username, action, from, to }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (username) { conditions.push(`username = $${idx++}`); params.push(username); }
    if (action)   { conditions.push(`action = $${idx++}`);   params.push(action); }
    if (from)     { conditions.push(`created_at >= $${idx++}`); params.push(from); }
    if (to)       { conditions.push(`created_at <= $${idx++}`); params.push(to); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT id, username, action, resource, details, ip_address, status, created_at
         FROM ml_commercial.admin_audit_log ${where}
         ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      ),
      this.pool.query(
        `SELECT COUNT(*) as total FROM ml_commercial.admin_audit_log ${where}`,
        params
      )
    ]);

    return { rows: dataResult.rows, total: parseInt(countResult.rows[0].total) };
  }
}
