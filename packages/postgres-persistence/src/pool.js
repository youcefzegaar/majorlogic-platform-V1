import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, "../../..");

export function readSql(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

export async function importPg() {
  try {
    return await import("pg");
  } catch (err) {
    throw new Error(
      "The `pg` package is required for Postgres persistence. Run `npm install` in the repository before using DATABASE_URL-backed persistence.",
      { cause: err }
    );
  }
}

export async function createPostgresClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    return null;
  }

  const { Pool } = await importPg();
  const isRemote = !/localhost|127\.0\.0\.1/.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ...(isRemote && { ssl: { rejectUnauthorized: false } }),
  });

  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  return pool;
}
