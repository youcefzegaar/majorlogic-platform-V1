import "dotenv/config";
import { getRepository } from "../apps/api/src/db/repository.js";

import { PipelineManager, CatalogGenerator, ReviewFetcher } from "../packages/catalog-core/src/index.js";
import { runCatalogPipeline } from "../packages/catalog-publish/src/index.js";
import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Unified Pipeline Execution Script
 * يجمع هذا السكربت كافة مراحل المعالجة (جلب، إثراء، تقنين، نشر) تحت مظلة الـ PipelineManager.
 */
async function run() {
  const domainId = "laptop-student-us";
  const repository = await getRepository();
  
  // تحميل سياقات الملاءمة (Fit Contexts)
  const fitContexts = JSON.parse(fs.readFileSync(path.resolve(`domains/${domainId}/generated/fit-contexts-proposal.json`), "utf8"));
  
  if (!repository) {
    console.error("[Pipeline] Critical: Database connection failed.");
    process.exit(1);
  }

  // 1. استيراد Domain Pack
  const domainPackUri = pathToFileURL(path.resolve(`domains/${domainId}/domain-pack.js`)).href;
  const domainModule = await import(domainPackUri);
  const domainPack = Object.values(domainModule).find(v => v?.meta?.domainId === domainId);

  if (!domainPack) {
    console.error(`[Pipeline] Critical: Domain Pack for ${domainId} not found.`);
    process.exit(1);
  }

  const pipeline = new PipelineManager({ repository, domainPack });
  const generator = new CatalogGenerator();
  const reviewFetcher = new ReviewFetcher(generator.fetcher);

  await pipeline.startRun();

  try {
    // المرحلة 1: الاستحواذ (Acquisition)
    const rawObservations = await pipeline.runStage('acquisition', async () => {
      // مصادر البيانات (مثال)
      const sources = [
        { platform: 'amazon', url: 'https://amazon.com/dp/B0CX258Y5C' },
        { platform: 'amazon', url: 'https://amazon.com/dp/B0D16V13T1' }
      ];
      let data = await generator.runAcquisition(domainPack, sources);
      
      // Fallback للـ Mock Data للتجربة في بيئة التطوير
      if (data.length === 0) {
        console.log("[Pipeline] [acquisition] No real data fetched, using mock data for testing...");
        data = [
          {
            itemName: "MacBook Air M3",
            variantName: "13-inch, 16GB RAM, 512GB SSD",
            sourceName: "amazon",
            sourceUrl: "https://amazon.com/mock-macbook",
            rawSpecs: { cpu: "M3", ram: "16GB", storage: "512GB", performance_score: 92, display_score: 95, battery_score: 98, thermals_score: 85, portability_score: 98 }
          },
          {
            itemName: "ASUS Zephyrus G14",
            variantName: "RTX 4060, 16GB RAM, 1TB SSD",
            sourceName: "amazon",
            sourceUrl: "https://amazon.com/mock-asus",
            rawSpecs: { cpu: "Ryzen 9", ram: "16GB", storage: "1TB", gpu: "RTX 4060", performance_score: 94, display_score: 92, battery_score: 75, thermals_score: 78, portability_score: 85 }
          }
        ];
      }

      return { 
        metadata: { 
          sourceCount: sources.length,
          acquiredCount: data.length 
        }, 
        data 
      };
    });

    // المرحلة 2: الإثراء (Enrichment - Review Intelligence)
    const enrichedObservations = await pipeline.runStage('enrichment', async () => {
      const data = rawObservations.data;
      console.log(`[Pipeline] Enriching ${data.length} observations with AI Review Intelligence...`);
      
      for (const obs of data) {
        // جلب الإشارات من Reddit و YouTube
        const redditSignals = await reviewFetcher.fetchRedditSignals(obs.itemName || obs.title);
        const ytSignals = await reviewFetcher.fetchYouTubeTranscripts(obs.itemName || obs.title);
        
        // توليد البصيرة (Intelligence)
        const intelligence = await reviewFetcher.produceIntelligence(
          obs.itemName || obs.title, 
          redditSignals.join(" ") + ytSignals
        );
        
        // ربط البيانات الإضافية بالملاحظة
        obs.reviewIntelligence = intelligence;
      }
      
      return { 
        metadata: { 
          enrichedCount: data.length 
        }, 
        data 
      };
    });

    // المرحلة 3: المعالجة والنشر (Processing & Publishing)
    const publishResult = await pipeline.runStage('publishing', async () => {
      const { publishedEntities, pipelineReport } = runCatalogPipeline({
        sourceRecords: enrichedObservations.data,
        domainPack,
        domainContext: { fitContexts },
        meta: {
          runId: pipeline.runId,
          acquiredAt: new Date().toISOString()
        }
      });

      console.log(`[Pipeline] Publishing ${publishedEntities.length} entities to database...`);
      
      const catalogVersion = `v1.${Date.now()}`;
      
      // 1. إنشاء سجل دورة النشر
      const publishRunId = await repository.createPublishRun({
        domainId: domainPack.meta.domainId,
        catalogVersion,
        sourceObservationCount: enrichedObservations.data.length,
        observationSource: 'pipeline_v2'
      });

      // 2. نشر الكيانات
      await repository.publishEntities({
        domainId: domainPack.meta.domainId,
        entities: publishedEntities,
        publishRunId,
        catalogVersion
      });

      // 3. إنهاء دورة النشر
      await repository.completePublishRun({
        runId: publishRunId,
        publishedEntityCount: publishedEntities.length
      });

      return { 
        metadata: {
          ...pipelineReport,
          publishRunId,
          catalogVersion
        },
        data: publishedEntities 
      };
    });

    await pipeline.completeRun();
    console.log("\n✅ Pipeline completed successfully!");
    console.log(`- Entities Published: ${publishResult.data.length}`);
    
  } catch (err) {
    await pipeline.failRun(err.message);
    console.error(`\n❌ Pipeline failed: ${err.message}`);
    process.exit(1);
  } finally {
    if (repository) {
      await repository.shutdown();
    }
  }
}

run();
