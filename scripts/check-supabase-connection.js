import { loadEnvFile, requireEnv } from "./env.js";
import { createPostgresClient } from "../packages/postgres-persistence/src/index.js";

loadEnvFile();
requireEnv(["DATABASE_URL"]);

const client = await createPostgresClient(process.env.DATABASE_URL);

try {
  const result = await client.query("select current_database() as database_name, current_user as db_user, now() as now");
  console.log("PASS: connected to Postgres/Supabase");
  console.log(JSON.stringify(result.rows[0], null, 2));
} finally {
  await client.end();
}
