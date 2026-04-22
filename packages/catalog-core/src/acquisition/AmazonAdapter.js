/**
 * AmazonAdapter — محول متخصص لجلب البيانات من أمازون.
 * في المرحلة الصناعية، سيستخدم PA-API أو Scraper متطور.
 */
export class AmazonAdapter {
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

    return {
      sourceId: `amazon-${Date.now()}`,
      sourceType: this.sourceType,
      sourceName: this.sourceName,
      sourceUrl: productUrl,
      itemName: "Extracted Item Name", 
      variantName: "Standard",
      specs: {
        ramGb,
        storageGb
      },
      offers: [
        {
          seller: "Amazon",
          priceUsd: priceMatch ? parseFloat(priceMatch[1]) : 0,
          condition: "new",
          affiliate: true
        }
      ],
      rawPayload: html
    };
  }
}
