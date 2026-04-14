import { loadEnvFile, requireEnv } from "./env.js";
import { createPostgresClient } from "../packages/postgres-persistence/src/index.js";

loadEnvFile();
requireEnv(["DATABASE_URL"]);

const client = await createPostgresClient(process.env.DATABASE_URL);

try {
  const tables = await client.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_schema in ('ml_raw', 'ml_catalog', 'ml_decision', 'ml_growth', 'ml_governance')
    order by table_schema, table_name
  `);

  const domains = await client.query(`
    select domain_id, entity_type, segment_key, status
    from ml_governance.domain_registry
    order by domain_id
  `);

  console.log("TABLES");
  console.log(JSON.stringify(tables.rows, null, 2));
  console.log("DOMAINS");
  console.log(JSON.stringify(domains.rows, null, 2));
} finally {
  await client.end();
}
