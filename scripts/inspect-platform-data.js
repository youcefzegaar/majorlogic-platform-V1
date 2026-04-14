import { loadEnvFile, requireEnv } from "./env.js";
import { createPostgresClient } from "../packages/postgres-persistence/src/index.js";

loadEnvFile();
requireEnv(["DATABASE_URL"]);

const client = await createPostgresClient(process.env.DATABASE_URL);

try {
  const counts = await client.query(`
    select 'ml_raw.source_observations' as table_name, count(*)::int as row_count from ml_raw.source_observations
    union all
    select 'ml_raw.source_registry', count(*)::int from ml_raw.source_registry
    union all
    select 'ml_raw.ingestion_runs', count(*)::int from ml_raw.ingestion_runs
    union all
    select 'ml_catalog.published_entities', count(*)::int from ml_catalog.published_entities
    union all
    select 'ml_catalog.publish_runs', count(*)::int from ml_catalog.publish_runs
    union all
    select 'ml_decision.decision_runs', count(*)::int from ml_decision.decision_runs
    union all
    select 'ml_decision.ownership_recommendations', count(*)::int from ml_decision.ownership_recommendations
    union all
    select 'ml_decision.trust_audits', count(*)::int from ml_decision.trust_audits
    union all
    select 'ml_growth.page_payloads', count(*)::int from ml_growth.page_payloads
    union all
    select 'ml_growth.share_artifacts', count(*)::int from ml_growth.share_artifacts
    order by table_name
  `);

  const latestDecision = await client.query(`
    select id, domain_id, catalog_version, publish_run_id, logic_version, created_at
    from ml_decision.decision_runs
    order by created_at desc
    limit 3
  `);

  const latestEntities = await client.query(`
    select entity_id, catalog_version, title, published_at
    from ml_catalog.published_entities
    order by published_at desc, entity_id asc
    limit 5
  `);

  const latestPublishRuns = await client.query(`
    select id as publish_run_id, domain_id, catalog_version, source_observation_count, published_entity_count,
           observation_source, status, created_at, completed_at
    from ml_catalog.publish_runs
    order by created_at desc
    limit 3
  `);

  const latestIngestion = await client.query(`
    select id, domain_id, source_count, normalized_count, status, started_at, finished_at
    from ml_raw.ingestion_runs
    order by started_at desc
    limit 3
  `);

  console.log("COUNTS");
  console.log(JSON.stringify(counts.rows, null, 2));
  console.log("LATEST_DECISION");
  console.log(JSON.stringify(latestDecision.rows, null, 2));
  console.log("LATEST_ENTITIES");
  console.log(JSON.stringify(latestEntities.rows, null, 2));
  console.log("LATEST_PUBLISH_RUNS");
  console.log(JSON.stringify(latestPublishRuns.rows, null, 2));
  console.log("LATEST_INGESTION_RUNS");
  console.log(JSON.stringify(latestIngestion.rows, null, 2));
} finally {
  await client.end();
}
