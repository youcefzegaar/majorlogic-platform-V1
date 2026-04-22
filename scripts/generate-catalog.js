import { CatalogGenerator, ReviewFetcher } from "../packages/catalog-core/src/index.js";
import * as normalization from "../packages/catalog-normalization/src/index.js";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * محاكة لتشغيل المولد الصناعي الجديد.
 * هذا السكربت يربط كافة الرؤوس (Fetch, Review, Filter) معاً.
 */
async function run() {
  const domainId = "laptop-student-us";
  
  // 1. استيراد Domain Pack
  const domainPackUri = pathToFileURL(path.resolve(`domains/${domainId}/domain-pack.js`)).href;
  const domainModule = await import(domainPackUri);
  const domainPack = Object.values(domainModule).find(v => v?.meta?.domainId === domainId);

  // 2. تعريف المصادر (بدلاً من ملف محلي، سنستخدم روابط حقيقية)
  const sources = [
    { platform: 'amazon', url: 'https://amazon.com/dp/B0CX258Y5C' }, // M3 MacBook Air
    { platform: 'amazon', url: 'https://amazon.com/dp/B0D16V13T1' }  // ASUS Zephyrus
  ];

  // 3. تهيئة المولد
  const generator = new CatalogGenerator();
  const reviewFetcher = new ReviewFetcher(generator.fetcher);

  // 4. طبقة الاستحواذ (Layer 1)
  const rawObservations = await generator.runAcquisition(domainPack, sources);

  // 5. طبقة المراجعات (Layer 5 - Enrichment)
  for (const obs of rawObservations) {
    const redditSignals = await reviewFetcher.fetchRedditSignals(obs.itemName);
    const ytSignals = await reviewFetcher.fetchYouTubeTranscripts(obs.itemName);
    
    // استخدام الذكاء الاصطناعي لتحويل الإشارات إلى "بصيرة" (Intelligence)
    const intelligence = await reviewFetcher.produceIntelligence(obs.itemName, redditSignals.join(" ") + ytSignals);
    
    obs.reviewIntelligence = {
      primaryWarning: intelligence.primaryWarning,
      topCons: intelligence.topCons,
      reviewRiskScore: intelligence.riskScore
    };
  }

  // 6. طبقة التقنين والفلترة (Layer 3 & 4)
  const { valid, rejected, errors } = generator.processPipeline(rawObservations, domainPack, normalization);

  console.log("\n--- [Generator Report] ---");
  console.log(`✅ Valid Entities: ${valid.length}`);
  console.log(`❌ Rejected: ${rejected.length}`);
  console.log(`⚠️ Errors: ${errors.length}`);
  
  if (valid.length > 0) {
    console.log("\nSample Valid Entity Title:", valid[0].itemName || valid[0].title);
  }
}

run().catch(console.error);
