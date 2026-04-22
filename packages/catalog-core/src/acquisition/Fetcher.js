/**
 * Fetcher — محرك الجلب المرن للمنصة.
 * يدعم محاولات إعادة الاتصال، المهلة الزمنية، والتحقق من صحة الاستجابة.
 */
export class Fetcher {
  constructor(options = {}) {
    this.timeout = options.timeout ?? 10000;
    this.retries = options.retries ?? 3;
    this.retryDelay = options.retryDelay ?? 1000;
    this.userAgent = options.userAgent ?? 'MajorLogic-Bot/1.0 (Industrial Data Collector)';
  }

  /**
   * جلب المحتوى من رابط مع ميكانيكية إعادة المحاولة.
   */
  async fetch(url, options = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'User-Agent': this.userAgent,
            ...options.headers
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        return {
          url,
          status: response.status,
          body: await response.text(),
          contentType: response.headers.get('content-type')
        };
      } catch (err) {
        lastError = err;
        console.warn(`Attempt ${attempt} failed for ${url}: ${err.message}`);
        
        if (attempt < this.retries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    throw new Error(`Failed to fetch ${url} after ${this.retries} attempts. Last error: ${lastError.message}`);
  }
}
