import { randomUUID } from "node:crypto";

export class CatalogRepository {
  constructor(pool) {
    this.pool = pool;
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

  // M13: Returns oldest/newest published_at + stale flag for the domain's current catalog.
  // slaHours defaults to CATALOG_FRESHNESS_SLA_HOURS env var, falling back to 24.
  async getCatalogFreshness({ domainId, slaHours = null }) {
    const sla = slaHours ?? Number(process.env.CATALOG_FRESHNESS_SLA_HOURS ?? 24);
    const result = await this.pool.query(
      `SELECT
         COUNT(*)::int                         AS entity_count,
         MIN(published_at)                     AS oldest_published_at,
         MAX(published_at)                     AS newest_published_at,
         EXTRACT(EPOCH FROM (NOW() - MIN(published_at))) / 3600 AS oldest_age_hours
       FROM ml_catalog.published_entities
       WHERE domain_id = $1`,
      [domainId]
    );
    const row = result.rows[0] ?? {};
    const oldestAgeHours = row.oldest_age_hours != null ? parseFloat(row.oldest_age_hours) : null;
    return {
      entityCount: row.entity_count ?? 0,
      oldestPublishedAt: row.oldest_published_at ?? null,
      newestPublishedAt: row.newest_published_at ?? null,
      oldestAgeHours,
      slaHours: sla,
      isStale: oldestAgeHours != null ? oldestAgeHours > sla : true,
    };
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
}
