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
import { alertDbOffline } from "../monitoring/telegram.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, "../../../..");

// ─────────────────────────────────────────────
// Ruleset Cache (loaded once, restart to refresh)
// ─────────────────────────────────────────────

export const rulesetCache = new Map();

export function clearRulesetCache() {
  rulesetCache.clear();
}

export async function getRuleset(relativePath) {
  if (rulesetCache.has(relativePath)) {
    return rulesetCache.get(relativePath);
  }

  // Attempt DB load first if it's a domain config
  const domainMatch = relativePath.match(/domains\/([^/]+)\/decision-config.json/);
  if (domainMatch) {
    const domainId = domainMatch[1];
    const repo = await getRepository();
    if (repo) {
      const dbConfig = await repo.getDecisionLogic(domainId);
      if (dbConfig) {
        rulesetCache.set(relativePath, dbConfig.config_json);
        return dbConfig.config_json;
      }
    }
  }

  // Fallback to disk
  const raw = await fs.promises.readFile(path.join(root, relativePath), "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`[Repository] Failed to parse ${relativePath}: ${e.message}`, { cause: e });
  }

  // Lazy Migration: If we have a DB, save the disk config to it
  if (domainMatch) {
    const domainId = domainMatch[1];
    const repo = await getRepository();
    if (repo) {
      console.log(`[Repository] Lazy migrating config for ${domainId} to database...`);
      await repo.saveDecisionLogic(domainId, parsed);
    }
  }

  rulesetCache.set(relativePath, parsed);
  return parsed;
}

// ─────────────────────────────────────────────
// Repository Singleton + Reconnection Logic
// ─────────────────────────────────────────────

let repositoryInstance = null;
let _initPromise       = null;

async function _doInit() {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const client     = await createPostgresClient(process.env.DATABASE_URL);
      const repository = new PostgresPlatformRepository(client);
      await repository.applyMigrations();

      // On unexpected disconnect, invalidate singletons so next request reconnects
      client.on("error", (err) => {
        console.error(`[DB] Connection error:`, err.message);
        repositoryInstance = null;
        _initPromise       = null;
      });

      repositoryInstance = repository;
      return repository;

    } catch (err) {
      console.warn(`[DB] Connection attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err.message);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, attempt * 500)); // exponential back-off
      }
    }
  }

  const reason = "All 3 connection attempts failed — running without database.";
  console.error(`[DB] ${reason}`);
  alertDbOffline(reason);
  return null;
}

async function ensureInitialized() {
  if (!_initPromise) _initPromise = _doInit();
  return _initPromise;
}

export async function getRepository() {
  if (!process.env.DATABASE_URL) return null;

  // Return healthy existing instance without touching the promise
  if (repositoryInstance) return repositoryInstance;

  // Promise-based singleton: concurrent callers all await the same promise,
  // guaranteeing exactly-one initialization even under concurrent requests.
  return ensureInitialized();
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
