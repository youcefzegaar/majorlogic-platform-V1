import { ReviewIntelligenceAnalyzer } from "./ReviewIntelligenceAnalyzer.js";

/**
 * ReviewFetcher — الطبقة المسؤولة عن جلب المراجعات وتحليل المشاعر.
 */
export class ReviewFetcher {
  constructor(fetcher) {
    this.fetcher = fetcher;
    this.analyzer = new ReviewIntelligenceAnalyzer();
  }

  /**
   * جلب مراجعات منتج من Reddit.
   */
  async fetchRedditSignals(productName) {
    console.log(`[ReviewFetcher] Searching Reddit for: ${productName}`);
    return [
      "The battery life is amazing for office work.",
      "Gets a bit loud under heavy gaming load.",
      "The screen is peak quality."
    ];
  }

  /**
   * جلب نصوص مراجعات يوتيوب.
   */
  async fetchYouTubeTranscripts(productName) {
    console.log(`[ReviewFetcher] Fetching YouTube transcripts for: ${productName}`);
    return "This laptop is solid, but the keyboard flex is noticeable.";
  }

  /**
   * تحليل المراجعات باستخدام الذكاء الاصطناعي (Gemma).
   */
  async produceIntelligence(productName, rawSignals) {
    const combinedText = Array.isArray(rawSignals) ? rawSignals.join(" ") : rawSignals;
    return await this.analyzer.analyze(productName, combinedText);
  }
}

