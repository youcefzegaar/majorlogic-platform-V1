// scripts/demo.js
import fs from "node:fs";
import { loadEnvFile } from "./env.js";
import { executePlatformPipeline } from "../packages/platform-core/src/index.js";
import { laptopStudentUsDomainPack } from "../domains/laptop-student-us/domain-pack.js";
import { createPostgresClient, PostgresPlatformRepository } from "../packages/postgres-persistence/src/index.js";
import { resolvePublishedCatalog } from "../packages/postgres-persistence/src/catalog-loader.js";

loadEnvFile();

console.clear();
console.log("══════════════════════════════════════════════");
console.log("🚀 MAJORLOGIC PLATFORM v1 - DEMO");
console.log("══════════════════════════════════════════════\n");

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
}

const ruleset = loadJson("../rulesets/domains/laptop-student-us/ruleset.json");
const profile = loadJson("../examples/profile.json");

let repository = null;
let client = null;

if (process.env.DATABASE_URL) {
  client = await createPostgresClient(process.env.DATABASE_URL);
  repository = new PostgresPlatformRepository(client);
  await repository.applyMigrations();
}

try {
  const publishedCatalogState = await resolvePublishedCatalog({
    repository,
    domainId: laptopStudentUsDomainPack.meta.domainId,
    generatedFilePath: "domains/laptop-student-us/generated/published-catalog.generated.json"
  });

  if (!publishedCatalogState.entities.length) {
    console.log("⚠️  No published catalog found. Run catalog:ingest and catalog:publish first.");
    process.exit(1);
  }

  console.log(`📦 Published Catalog Source : ${publishedCatalogState.source}`);
  console.log(`🔢 Catalog Version         : ${publishedCatalogState.catalogVersion}`);
  console.log(`📊 Entities Count          : ${publishedCatalogState.entities.length}\n`);

  const result = await executePlatformPipeline({
    profile,
    domainPack: laptopStudentUsDomainPack,
    publishedEntities: publishedCatalogState.entities,
    catalogVersion: publishedCatalogState.catalogVersion,
    publishRunId: publishedCatalogState.publishRunId,
    ruleset,
    repository
  });

  // ==================== OUTPUT ====================
  console.log("✅ DECISION ENGINE OUTPUT");
  console.log("══════════════════════════════════════════════");
  console.log(`Major          : ${result.decision.segment}`);
  console.log(`Status         : ${result.decision.status}`);
  console.log(`Cards Returned : ${result.decision.cards.length}`);
  console.log(`Decision Confidence : ${result.trust.decisionConfidenceScore} (${result.trust.decisionConfidenceLevel})\n`);

  result.decision.cards.forEach((card, i) => {
    console.log(`${i + 1}. [${card.cardType.toUpperCase()}] ${card.title}`);
    console.log(`   Price: $${card.priceUsd} | Score: ${card.score.toFixed(1)}`);
    console.log(`   Why: ${card.whyThis}`);
    console.log(`   Bad News: ${card.badNews}`);
    console.log("   ───────────────────────────────");
  });

  console.log("\n🎯 DEMO COMPLETED SUCCESSFULLY");
  console.log("══════════════════════════════════════════════");

} finally {
  if (client) await client.end();
}
