import { randomUUID } from "node:crypto";

export class RawIngestionRepository {
  constructor(pool) {
    this.pool = pool;
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
}
