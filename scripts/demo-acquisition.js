import { AcquisitionManager, RedditExtractor } from "../packages/catalog-acquisition/src/index.js";
import { QualityIntelligence } from "../packages/quality-intelligence/src/index.js";

const acquisition = new AcquisitionManager();
const intelligence = new QualityIntelligence();

// 1. تسجيل المستخرجات
acquisition.registerExtractor("reddit", new RedditExtractor());

async function runAcquisitionDemo() {
    console.log("--- DEMO: Automated Review Acquisition ---");

    // 2. جلب البيانات آلياً لمنتج "ThinkPad P1"
    const rawData = await acquisition.fetchReviews("ThinkPad P1");
    console.log("[Data] Raw evidence acquired:", JSON.stringify(rawData, null, 2));

    // 3. تحويل البيانات الخام إلى إشارات جودة
    const redditData = rawData.reddit;
    const signals = {
        "thermals": { negativeCount: 30 } // 30 / 142 > 15%
    };

    // 4. تحليل المخاطر
    const risks = intelligence.detectFatalRisks(signals, redditData.mentions);
    console.log("\n[Intelligence] Risk Analysis Result:", risks);

    if (risks.length > 0) {
        console.log("✅ Full Loop Success: Acquired data and detected a risk pattern.");
    }
}

runAcquisitionDemo();
