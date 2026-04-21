/**
 * DB Repository Module
 *
 * مسؤوليات:
 *   1. Singleton لاتصال قاعدة البيانات مع retry logic
 *   2. Async cache للـ rulesets الثابتة (تُحمّل مرة واحدة عند الـ startup)
 *
 * القاعدة: كل ما يتعلق بـ Postgres يمر عبر هذا الملف.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPostgresClient, PostgresPlatformRepository } from "../../../../packages/postgres-persistence/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, "../../../..");

// ─────────────────────────────────────────────
// Ruleset Cache (loaded once, restart to refresh)
// ─────────────────────────────────────────────

const rulesetCache = new Map();

export async function getRuleset(relativePath) {
  if (rulesetCache.has(relativePath)) {
    return rulesetCache.get(relativePath);
  }
  const raw     = await fs.promises.readFile(path.join(root, relativePath), "utf8");
  const parsed  = JSON.parse(raw);
  rulesetCache.set(relativePath, parsed);
  return parsed;
}

// ─────────────────────────────────────────────
// Repository Singleton + Reconnection Logic
// ─────────────────────────────────────────────

let repositoryInstance = null;
let isConnecting       = false;

export async function getRepository() {
  if (!process.env.DATABASE_URL) return null;

  // Return healthy existing instance
  if (repositoryInstance) return repositoryInstance;

  // Prevent concurrent connection races
  if (isConnecting) {
    await new Promise((r) => setTimeout(r, 200));
    return repositoryInstance;
  }

  isConnecting = true;
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const client     = await createPostgresClient(process.env.DATABASE_URL);
      const repository = new PostgresPlatformRepository(client);
      await repository.applyMigrations();

      // On unexpected disconnect, invalidate singleton so next request reconnects
      client.on("error", (err) => {
        console.error(`[DB] Connection error (attempt ${attempt}):`, err.message);
        repositoryInstance = null;
      });

      repositoryInstance = repository;
      isConnecting       = false;
      return repository;

    } catch (err) {
      console.warn(`[DB] Connection attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err.message);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 500)); // exponential back-off
      }
    }
  }

  isConnecting = false;
  console.error("[DB] All connection attempts exhausted. Running without database.");
  return null;
}

// ─────────────────────────────────────────────
// JSON file helpers (sync-at-startup, async otherwise)
// ─────────────────────────────────────────────

export function loadJsonSync(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

export async function loadJsonAsync(relativePath) {
  const raw = await fs.promises.readFile(path.join(root, relativePath), "utf8");
  return JSON.parse(raw);
}
