/**
 * Price Monitor Job
 *
 * يعمل يومياً: يفحص كل leads من نوع price_alert
 * إذا انخفض سعر الجهاز بنسبة 3%+ → يرسل إيميل تنبيه
 * يحفظ السعر المرصود في metadata.watchedPriceUsd بعد الإرسال
 */

import { sendPriceDropAlert } from "../../../../packages/email-service/src/index.js";

export async function runPriceMonitor(repository) {
  const results = { checked: 0, alerted: 0, errors: 0 };

  const leads = await repository.getAllPriceAlertLeads();
  if (!leads.length) {
    console.log("[PriceMonitor] No price alert leads found.");
    return results;
  }

  // Build entity price map per domain (load each domain's catalog once)
  const entityPriceCache = new Map(); // "domainId:entityId" → { priceUsd, title, buyUrl }

  const loadDomainEntities = async (domainId) => {
    if (entityPriceCache.has(`__loaded:${domainId}`)) return;
    const entities = await repository.getPublishedEntities({ domainId });
    for (const entity of entities) {
      if (!entity?.entityId) continue;
      const price = entity.market?.bestOffer?.priceUsd ?? null;
      const buyUrl = entity.market?.bestOffer?.url ?? null;
      entityPriceCache.set(`${domainId}:${entity.entityId}`, {
        priceUsd: price,
        title: entity.title ?? entity.entityId,
        buyUrl
      });
    }
    entityPriceCache.set(`__loaded:${domainId}`, true);
  };

  for (const lead of leads) {
    results.checked++;
    const { id: leadId, email, domain_id: domainId, metadata = {} } = lead;
    const entityId = metadata.entityId;
    const watchedPrice = metadata.watchedPriceUsd ? Number(metadata.watchedPriceUsd) : null;

    if (!entityId) continue;

    try {
      await loadDomainEntities(domainId);
      const current = entityPriceCache.get(`${domainId}:${entityId}`);
      if (!current || current.priceUsd == null) continue;

      const currentPrice = current.priceUsd;

      if (watchedPrice == null) {
        // First time: just record the price, don't alert
        await repository.updateLeadMetadata({
          leadId,
          metadata: { ...metadata, watchedPriceUsd: currentPrice }
        });
        continue;
      }

      const dropRatio = (watchedPrice - currentPrice) / watchedPrice;
      if (dropRatio >= 0.03) {
        // 3%+ drop detected — send alert
        await sendPriceDropAlert({
          email,
          entityId,
          oldPrice: watchedPrice,
          newPrice: currentPrice,
          buyUrl: current.buyUrl
        });

        // Update watched price to new baseline so we don't re-alert
        await repository.updateLeadMetadata({
          leadId,
          metadata: { ...metadata, watchedPriceUsd: currentPrice, lastAlertedAt: new Date().toISOString() }
        });

        results.alerted++;
        console.log(`[PriceMonitor] Alert sent: ${email} | ${entityId} | $${watchedPrice} → $${currentPrice}`);
      }
    } catch (err) {
      results.errors++;
      console.error(`[PriceMonitor] Error processing lead ${leadId}:`, err.message);
    }
  }

  console.log(`[PriceMonitor] Done. Checked: ${results.checked}, Alerted: ${results.alerted}, Errors: ${results.errors}`);
  return results;
}
