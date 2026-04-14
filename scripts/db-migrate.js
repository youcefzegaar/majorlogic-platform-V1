import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadEnvFile } from "./env.js";
import { createPostgresClient, PostgresPlatformRepository } from "../packages/postgres-persistence/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
loadEnvFile(path.join(root, ".env"));

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ Error: DATABASE_URL is not set in .env");
    process.exit(1);
  }

  console.log("🔄 Connecting to Supabase (Database)...");
  const client = await createPostgresClient(dbUrl);
  
  if (!client) {
    console.error("❌ Failed to create Postgres client.");
    process.exit(1);
  }

  const repository = new PostgresPlatformRepository(client);

  console.log("✅ Connected successfully. Applying migrations...");
  try {
    await repository.applyMigrations();
    console.log("🚀 All migrations and seed data applied successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
