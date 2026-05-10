/**
 * Acquisition Manager — Orchestrating data sensors across the web.
 */

export class AcquisitionManager {
  constructor(logger = console) {
    this.logger = logger;
    this.extractors = new Map();
  }

  registerExtractor(name, extractor) {
    this.extractors.set(name, extractor);
  }

  /**
   * جلب المراجعات لمنتج معين من كافة المصادر المسجلة وحفظها في قاعدة البيانات إذا توفرت.
   */
  async fetchReviews(productName, context = {}) {
    this.logger.log(`[Acquisition] Starting acquisition for: ${productName}`);
    
    const { repository, domainId } = context;
    let runId = null;

    if (repository && domainId) {
        runId = await repository.createAcquisitionRun({ 
            domainId, 
            metadata: { productName } 
        });
    }

    const results = {};
    for (const [name, extractor] of this.extractors.entries()) {
      try {
        this.logger.log(`[Acquisition] Running extractor: ${name}`);
        const data = await extractor.fetch(productName, context);
        results[name] = data;

        if (runId && repository) {
            await repository.saveReviewObservations({
                runId,
                sourceName: name,
                productName,
                rawData: data,
                sentimentScore: data.sentimentScore,
                extractedSignals: data.extractedCons
            });
        }
      } catch (err) {
        this.logger.error(`[Acquisition] Extractor ${name} failed: ${err.message}`);
      }
    }

    if (runId && repository) {
        await repository.completeAcquisitionRun({ id: runId });
    }

    return results;
  }
}

/**
 * Reddit Extractor — Prototype (Simulated for now)
 */
export class RedditExtractor {
  async fetch(productName) {
    // هنا يتم الاتصال بـ Reddit API أو Scraper
    // سنقوم بمحاكاة النتيجة لإثبات المفهوم
    return {
      source: "reddit",
      mentions: 142,
      sentimentScore: 0.65,
      extractedCons: ["thermal_throttling", "fan_noise"],
      topThreads: [
        { title: `${productName} heating issues?`, upvotes: 45 }
      ]
    };
  }
}
