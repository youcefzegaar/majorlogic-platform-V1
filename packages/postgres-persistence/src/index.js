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

  const { Client } = await importPg();
  const client = new Client({ connectionString });
  client.on("error", (err) => {
    console.error("Supabase DB connection error:", err.message);
  });
  await client.connect();
  return client;
}

export class PostgresPlatformRepository {
  constructor(client) {
    this.client = client;
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
      "database/seeds/0001_domain_registry.sql"
    ];

    for (const file of migrationFiles) {
      await this.client.query(readSql(file));
    }
  }

  async saveSourceObservations({ domainId, observations }) {
    await this.client.query('BEGIN');
    try {
      for (const observation of observations) {
        await this.client.query(
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
      await this.client.query('COMMIT');
    } catch (err) {
      await this.client.query('ROLLBACK');
      throw err;
    }
  }

  async getLatestSourceObservations({ domainId, limit = 200 }) {
    const result = await this.client.query(
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
    const result = await this.client.query(
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
    const result = await this.client.query(
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
      await this.client.query(
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
    await this.client.query(
      `insert into ml_raw.ingestion_runs (
        id, domain_id, source_count, status
      ) values ($1, $2, $3, 'running')`,
      [runId, domainId, sourceCount]
    );
    return runId;
  }

  async completeIngestionRun({ runId, normalizedCount, status = "completed" }) {
    await this.client.query(
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
    await this.client.query(
      `insert into ml_catalog.publish_runs (
        id, domain_id, catalog_version, source_observation_count, observation_source, status
      ) values ($1, $2, $3, $4, $5, 'running')`,
      [runId, domainId, catalogVersion, sourceObservationCount, observationSource]
    );
    return runId;
  }

  async completePublishRun({ runId, publishedEntityCount, status = "completed" }) {
    await this.client.query(
      `update ml_catalog.publish_runs
       set published_entity_count = $2,
           status = $3,
           completed_at = now()
       where id = $1`,
      [runId, publishedEntityCount, status]
    );
  }

  async publishEntities({ domainId, entities, publishRunId = null, catalogVersion = null }) {
    await this.client.query('BEGIN');
    try {
      for (const entity of entities) {
        await this.client.query(
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
      await this.client.query('COMMIT');
    } catch (err) {
      await this.client.query('ROLLBACK');
      throw err;
    }
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
    const decisionRunId = randomUUID();
    await this.client.query(
      `insert into ml_decision.decision_runs (
        id, domain_id, publish_run_id, catalog_version, profile_payload, logic_version, cards_payload
      ) values ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb)`,
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

    await this.client.query(
      `insert into ml_decision.ownership_recommendations (
        id, decision_run_id, strategy_payload
      ) values ($1, $2, $3::jsonb)`,
      [randomUUID(), decisionRunId, JSON.stringify(ownership)]
    );

    await this.client.query(
      `insert into ml_decision.trust_audits (
        id, decision_run_id, audit_payload, audit_ok
      ) values ($1, $2, $3::jsonb, $4)`,
      [randomUUID(), decisionRunId, JSON.stringify(trust), trust.ok]
    );
  }

  async saveGrowthArtifacts({ domainId, growth }) {
    if (growth.seoPagePayload) {
      await this.client.query(
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
      await this.client.query(
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
      await this.client.query(
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
    const countsResult = await this.client.query(
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

    const latestIngestionResult = await this.client.query(
      `select id, source_count, normalized_count, status, started_at, finished_at
       from ml_raw.ingestion_runs
       where domain_id = $1
       order by started_at desc
       limit 1`,
      [domainId]
    );

    const latestPublishResult = await this.client.query(
      `select id as publish_run_id, catalog_version, source_observation_count, published_entity_count,
              observation_source, status, created_at, completed_at
       from ml_catalog.publish_runs
       where domain_id = $1
       order by created_at desc
       limit 1`,
      [domainId]
    );

    const latestDecisionResult = await this.client.query(
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
    const decisionResult = await this.client.query(
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

    const ownershipResult = await this.client.query(
      `select strategy_payload
       from ml_decision.ownership_recommendations
       where decision_run_id = $1
       limit 1`,
      [decision.decision_run_id]
    );

    const trustResult = await this.client.query(
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
    const result = await this.client.query(
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

  async saveGuardrailEvents() {
    // No-Op for now, reserved for governance tracking
  }

  async saveGrowthArtifacts() {
    // No-Op for now, reserved for SEO artifact tracking
  }

  async saveDecisionRun({ domainId, profile, ruleset, decision, ownership, trust, catalogVersion, publishRunId }) {
    await this.client.query(
      `INSERT INTO ml_telemetry.decision_runs (id, domain_id, profile_id, segment, payload_json)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [
        decision.decisionRunId, 
        domainId, 
        profile.id ?? decision.profileId ?? "anonymous", 
        decision.segment ?? "unknown", 
        JSON.stringify({ profile, ruleset, decision, ownership, trust, catalogVersion, publishRunId })
      ]
    );
  }

  async saveTelemetryClick({ decisionRunId, entityId, clickType }) {
    await this.client.query(
      `INSERT INTO ml_telemetry.telemetry_clicks (decision_run_id, entity_id, click_type)
       VALUES ($1, $2, $3)`,
      [decisionRunId, entityId, clickType]
    );
  }

  async saveGrowthLead({ domainId, email, leadType, metadata = {}, optedIn = false }) {
    const result = await this.client.query(
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
    const result = await this.client.query(
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
    const result = await this.client.query(
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
}
