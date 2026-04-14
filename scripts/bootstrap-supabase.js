import { loadEnvFile, requireEnv } from "./env.js";
import { createPostgresClient, PostgresPlatformRepository } from "../packages/postgres-persistence/src/index.js";

loadEnvFile();
requireEnv(["DATABASE_URL"]);

const client = await createPostgresClient(process.env.DATABASE_URL);
const repository = new PostgresPlatformRepository(client);

try {
  await repository.applyMigrations();
  console.log("PASS: Supabase/Postgres backbone migrations and seeds applied.");
} finally {
  await client.end();
}
