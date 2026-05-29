/**
 * Price Monitor Job
 *
 * يعمل يومياً — يفحص مصدرين:
 *   1. ml_growth.leads (lead_type='price_alert') — مستخدمون مجهولون أعطوا إيميلهم فقط
 *   2. ml_users.price_alerts — مستخدمون مسجّلون (M3)
 * إذا انخفض سعر الجهاز بنسبة 3%+ → يرسل إيميل تنبيه
 */

import { sendPriceDropAlert } from "../../../../packages/email-service/src/index.js";

const DROP_THRESHOLD = 0.03; // 3% price drop triggers alert

// Build entity price map per domain (shared across both passes)
async function buildEntityPriceCache(repository, domainIds) {
  const cache = new Map(); // "domainId:entityId" → { priceUsd, title, buyUrl }
  for (const domainId of new Set(domainIds)) {
    const entities = await repository.getPublishedEntities({ domainId });
    for (const entity of entities) {
      if (!entity?.entityId) continue;
      cache.set(`${domainId}:${entity.entityId}`, {
        priceUsd: entity.market?.bestOffer?.priceUsd ?? null,
        title:    entity.title ?? entity.entityId,
        buyUrl:   entity.market?.bestOffer?.url ?? null,
      });
    }
  }
  return cache;
}

// ── Pass 1: Anonymous growth leads ────────────────────────────────────────────

async function processGrowthLeads(repository, cache, results) {
  const leads = await repository.getAllPriceAlertLeads();
  for (const lead of leads) {
    results.checked++;
    const { id: leadId, email, domain_id: domainId, metadata = {} } = lead;
    const entityId = metadata.entityId;
    if (!entityId) continue;

    try {
      const current = cache.get(`${domainId}:${entityId}`);
      if (!current || current.priceUsd == null) continue;

      const currentPrice = current.priceUsd;
      const watchedPrice = metadata.watchedPriceUsd ? Number(metadata.watchedPriceUsd) : null;

      if (watchedPrice == null) {
        await repository.updateLeadMetadata({ leadId, metadata: { ...metadata, watchedPriceUsd: currentPrice } });
        continue;
      }

      if (!(watchedPrice > 0)) continue;
      const dropRatio = (watchedPrice - currentPrice) / watchedPrice;
      if (dropRatio >= DROP_THRESHOLD) {
        await sendPriceDropAlert({ email, entityId, oldPrice: watchedPrice, newPrice: currentPrice, buyUrl: current.buyUrl });
        await repository.updateLeadMetadata({ leadId, metadata: { ...metadata, watchedPriceUsd: currentPrice, lastAlertedAt: new Date().toISOString() } });
        results.alerted++;
        console.log(`[PriceMonitor:growth] Alert: ${email} | ${entityId} | $${watchedPrice}→$${currentPrice}`);
      }
    } catch (err) {
      results.errors++;
      console.error(`[PriceMonitor:growth] Error lead ${leadId}:`, err.message);
    }
  }
}

// ── Pass 2: Authenticated user price alerts ───────────────────────────────────

async function processUserAlerts(repository, cache, results) {
  let alerts;
  try {
    alerts = await repository.getAllActivePriceAlerts();
  } catch {
    // Method may not be available if DB schema not yet migrated — skip silently
    return;
  }

  for (const alert of alerts) {
    results.checked++;
    const { id: alertId, email, entity_id: entityId, domain = 'laptop-student-us', current_price: storedPrice } = alert;
    if (!entityId) continue;

    try {
      const current = cache.get(`${domain}:${entityId}`);
      if (!current || current.priceUsd == null) continue;

      const currentPrice = current.priceUsd;
      const watchedPrice = storedPrice ? Number(storedPrice) : null;

      if (watchedPrice == null) {
        await repository.updatePriceAlertCurrentPrice(alertId, currentPrice);
        continue;
      }

      if (!(watchedPrice > 0)) continue;
      const dropRatio = (watchedPrice - currentPrice) / watchedPrice;
      if (dropRatio >= DROP_THRESHOLD) {
        await sendPriceDropAlert({ email, entityId, oldPrice: watchedPrice, newPrice: currentPrice, buyUrl: current.buyUrl });
        await repository.updatePriceAlertCurrentPrice(alertId, currentPrice);
        results.alerted++;
        console.log(`[PriceMonitor:user] Alert: ${email} | ${entityId} | $${watchedPrice}→$${currentPrice}`);
      }
    } catch (err) {
      results.errors++;
      console.error(`[PriceMonitor:user] Error alert ${alertId}:`, err.message);
    }
  }
}

// ── Main entry ────────────────────────────────────────────────────────────────

export async function runPriceMonitor(repository) {
  const results = { checked: 0, alerted: 0, errors: 0 };

  // Load both lead sets to know which domains to cache
  const [growthLeads, userAlerts] = await Promise.all([
    repository.getAllPriceAlertLeads().catch(() => []),
    repository.getAllActivePriceAlerts().catch(() => []),
  ]);

  if (!growthLeads.length && !userAlerts.length) {
    console.log("[PriceMonitor] No price alerts to process.");
    return results;
  }

  const domainIds = [
    ...growthLeads.map(l => l.domain_id).filter(Boolean),
    ...userAlerts.map(a => a.domain ?? 'laptop-student-us'),
  ];

  const cache = await buildEntityPriceCache(repository, domainIds);

  await processGrowthLeads(repository, cache, results);
  await processUserAlerts(repository, cache, results);

  console.log(`[PriceMonitor] Done. checked=${results.checked} alerted=${results.alerted} errors=${results.errors}`);
  return results;
}

export function schedulePriceMonitor(repository) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  // Run once at startup (after a short delay) then every 24 hours
  setTimeout(() => {
    runPriceMonitor(repository).catch(err => console.error('[PriceMonitor] Job error:', err.message));
    setInterval(() => {
      runPriceMonitor(repository).catch(err => console.error('[PriceMonitor] Job error:', err.message));
    }, MS_PER_DAY);
  }, 60_000); // 1 minute after startup to let DB connections settle
  console.log('[PriceMonitor] Scheduled — first run in 60s, then every 24h');
}
