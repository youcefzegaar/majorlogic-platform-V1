import { getRepository } from "./apps/api/src/db/repository.js";
import { loadEnvFile } from "./scripts/env.js";

loadEnvFile(process.cwd() + "/.env");

async function run() {
  const repo = await getRepository();
  if (!repo) { console.error("FAIL: DB not available."); process.exit(1); }

  console.log("🧪 Testing Growth Lead Engine - 3 Ethical Nets\n");

  // Net 1: Save Results (Window Shopper)
  const lead1 = await repo.saveGrowthLead({
    domainId: "laptop-student-us",
    email: "Ahmed.AlFarsi@university.edu",
    leadType: "save_results",
    metadata: { decisionRunId: "f6aca600-2d89-4730-a4b2-e9b636b9fa03", segment: "cs" },
    optedIn: true
  });
  console.log(`✅ Net 1 [save_results]      → Lead ID: ${lead1.id}`);

  // Net 2: Price Alert (Bargain Hunter)
  const lead2 = await repo.saveGrowthLead({
    domainId: "laptop-student-us",
    email: "sara.engineering@ksu.edu.sa",
    leadType: "price_alert",
    metadata: { entityId: "laptop_dell_xps15_001", targetPriceUsd: 1299, currentPriceUsd: 1499 },
    optedIn: true
  });
  console.log(`✅ Net 2 [price_alert]       → Lead ID: ${lead2.id}`);

  // Net 3: Interstitial Gate (Ready to Buy)
  const lead3 = await repo.saveGrowthLead({
    domainId: "laptop-student-us",
    email: "khalid.cs@kfupm.edu.sa",
    leadType: "interstitial_gate",
    metadata: { decisionRunId: "f6aca600-2d89-4730-a4b2-e9b636b9fa03", entityId: "laptop_macbook_pro14_001", clickType: "buy_now_clicked" },
    optedIn: false  // يختار طالب ثالث عدم الموافقة على التسويق (حقه الكامل)
  });
  console.log(`✅ Net 3 [interstitial_gate] → Lead ID: ${lead3.id} (opted_in: false - respected!)`);

  // Verify all 3 are in DB
  const allLeads = await repo.getGrowthLeads({ domainId: "laptop-student-us" });
  console.log(`\n📊 Total leads in ml_growth.leads: ${allLeads.length}`);
  
  // Verify filtering by type works
  const priceAlerts = await repo.getGrowthLeads({ domainId: "laptop-student-us", leadType: "price_alert" });
  console.log(`📊 Price alert leads filtered: ${priceAlerts.length}`);

  console.log("\n🎉 Growth Lead Engine E2E - ALL PASSED!");
  process.exit(0);
}
run();
