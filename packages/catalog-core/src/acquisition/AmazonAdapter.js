import { createHash } from 'node:crypto';

/**
 * AmazonAdapter — محول متخصص لجلب البيانات من أمازون.
 * في المرحلة الصناعية، سيستخدم PA-API أو Scraper متطور.
 */
export class AmazonAdapter {
  /**
   * Returns a stable, content-addressed source ID derived from the product URL.
   * Using SHA-256 ensures the same URL always produces the same ID (deterministic).
   */
  static _sourceIdFromUrl(productUrl) {
    return 'amazon-sha-' + createHash('sha256').update(productUrl).digest('hex');
  }
  constructor(fetcher) {
    this.fetcher = fetcher;
    this.sourceName = 'Amazon';
    this.sourceType = 'retailer';
  }

  /**
   * تحويل رابط منتج إلى ملاحظة (Observation) خام.
   */
  async acquire(productUrl) {
    const result = await this.fetcher.fetch(productUrl);
    const html = result.body;

    // استخراج المواصفات برمجياً (Heuristic Parsing) لتقليل تكلفة الـ AI
    const ramMatch = html.match(/(\d+)\s*GB\s*RAM/i) || html.match(/Memory:\s*(\d+)GB/i);
    const storageMatch = html.match(/(\d+)\s*GB\s*SSD/i) || html.match(/(\d+)\s*TB\s*SSD/i);
    const priceMatch = html.match(/\$(\d+\.?\d*)/);

    const ramGb = ramMatch ? parseInt(ramMatch[1]) : 0;
    let storageGb = 0;
    if (storageMatch) {
      const val = parseInt(storageMatch[1]);
      storageGb = html.toLowerCase().includes("tb") && val < 10 ? val * 1024 : val;
    }

    // استخراج اسم المنتج الحقيقي من الـ HTML
    const titleMatch = html.match(/<span[^>]*id="productTitle"[^>]*>(.*?)<\/span>/s) || 
                       html.match(/<meta\s+name="title"\s+content="(.*?)"/i) ||
                       html.match(/<title>(.*?)<\/title>/i);
    
    const itemName = titleMatch ? titleMatch[1].trim().replace(/\n/g, "") : "Unknown Amazon Product";

    return {
      sourceId: AmazonAdapter._sourceIdFromUrl(productUrl),
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      sourceUrl: productUrl,
      itemName, 
      variantName: "Standard",
      specs: {
        ramGb,
        storageGb
      },
      offers: [
        {
          seller: "Amazon",
          sellerType: "retailer",
          priceUsd: priceMatch ? parseFloat(priceMatch[1]) : 0,
          condition: "new",
          affiliate: true
        }
      ],
      rawPayload: html
    };
  }
}
