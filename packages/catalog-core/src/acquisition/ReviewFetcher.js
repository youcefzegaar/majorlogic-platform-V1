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
    // استخدام الـ fetcher لجلب البيانات الحقيقية من واجهة برمجية
    try {
      // إضافة limit=10 و sort=relevance لتحسين جودة وأداء النتائج
      const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(productName + ' review')}&limit=10&sort=relevance`;
      const result = await this.fetcher.fetch(searchUrl);
      const data = JSON.parse(result.body);

      if (!data?.data?.children || data.data.children.length === 0) {
        throw new Error("No Reddit results found for this query.");
      }

      // استخراج النصوص من النتائج
      return data.data.children.map(child => child.data.selftext || child.data.title);
    } catch (err) {
      console.warn(`[ReviewFetcher] Reddit fetch failed, using fallback data: ${err.message}`);
      return [
        "The battery life is poor on this model.",
        "Gets very loud under heavy gaming load.",
        "The OLED screen is high quality but glossy."
      ];
    }
  }

  /**
   * جلب نصوص مراجعات يوتيوب.
   */
  async fetchYouTubeTranscripts(productName) {
    console.log(`[ReviewFetcher] Fetching YouTube transcripts for: ${productName}`);
    // محاكاة جلب الترجمات عبر الـ fetcher
    try {
      // في الواقع سنستخدم YouTube Data API أو خدمة محددة
      const mockYtUrl = `https://example.com/yt-transcript?q=${encodeURIComponent(productName)}`;
      const result = await this.fetcher.fetch(mockYtUrl);
      return result.body;
    } catch (err) {
      console.warn(`[ReviewFetcher] YouTube fetch failed, using fallback: ${err.message}`);
      return "This laptop is solid, but the fans are jet engines under load.";
    }
  }

  /**
   * تحليل المراجعات باستخدام الذكاء الاصطناعي (Gemma).
   */
  async produceIntelligence(productName, rawSignals) {
    const combinedText = Array.isArray(rawSignals) ? rawSignals.join(" ") : rawSignals;
    return await this.analyzer.analyze(productName, combinedText);
  }
}
