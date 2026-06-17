/**
 * refresh-prices — update market.offers/bestOffer for priority catalog entities.
 *
 * Usage:
 *   node scripts/refresh-prices.js
 *
 * Required env (at least one adapter must be configured):
 *   PRICE_SOURCE_AMAZON_PROVIDER  — 'flybyapis' | 'rainforest'
 *   PRICE_SOURCE_AMAZON_KEY       — provider API key
 *   PRICE_REFRESH_MAX_REQUESTS    — max API calls per run (default: 30)
 *   PRICE_STALE_DAYS              — days before offer is considered stale (default: 14)
 *
 * Output:
 *   Updates domains/laptop-student-us/generated/published-catalog.generated.json
 *   Writes  domains/laptop-student-us/generated/price-refresh-log.json
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadAdapter }   from '../packages/price-sources/src/index.js';
import { refreshCatalogPrices } from '../packages/price-sources/src/refresh.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOMAIN_DIR = join(__dirname, '../domains/laptop-student-us/generated');

// --- Load catalog ---
const catalogPath = join(DOMAIN_DIR, 'published-catalog.generated.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
// Catalog is a JSON array stored as object with numeric keys
const entities = Array.isArray(catalog) ? catalog : Object.values(catalog);

// --- Collect priority entityIds from SEO page top cards ---
const seoPagesDir = join(DOMAIN_DIR, 'seo-pages');
const priorityIds = new Set();
for (const file of readdirSync(seoPagesDir)) {
  if (!file.endsWith('.json') || file === '_index.json') continue;
  try {
    const page = JSON.parse(readFileSync(join(seoPagesDir, file), 'utf8'));
    for (const card of Object.values(page.cards ?? {})) {
      if (card?.entityId) priorityIds.add(card.entityId);
    }
  } catch { /* skip malformed pages */ }
}

// --- Load adapter ---
const providerName = process.env.PRICE_SOURCE_AMAZON_PROVIDER;
if (!providerName) {
  console.error('[refresh-prices] No adapter configured. Set PRICE_SOURCE_AMAZON_PROVIDER.');
  process.exit(1);
}

const adapter = await loadAdapter('amazon-thirdparty');

// --- Run refresh ---
const maxRequests = parseInt(process.env.PRICE_REFRESH_MAX_REQUESTS ?? '30', 10);
const staleDays   = parseInt(process.env.PRICE_STALE_DAYS ?? '14', 10);

const stats = await refreshCatalogPrices(entities, adapter, {
  maxRequests,
  staleDays,
  priorityIds: [...priorityIds],
  logger: console,
});

// --- Persist catalog ---
writeFileSync(catalogPath, JSON.stringify(entities, null, 2));

// --- Write refresh log for daily-report ---
const logPath = join(DOMAIN_DIR, 'price-refresh-log.json');
writeFileSync(logPath, JSON.stringify({ ...stats, runAt: new Date().toISOString() }, null, 2));

console.log(`[refresh-prices] Done: ${stats.refreshed} refreshed, ${stats.stale} stale, ${stats.failed} failed`);
