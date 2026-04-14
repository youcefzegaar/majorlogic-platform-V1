import fs from "node:fs";
import path from "node:path";
import { loadEnvFile } from "./env.js";
import { executePlatformPipeline } from "../packages/platform-core/src/index.js";
import { laptopStudentUsDomainPack } from "../domains/laptop-student-us/domain-pack.js";
import { createPostgresClient, PostgresPlatformRepository } from "../packages/postgres-persistence/src/index.js";
import { resolvePublishedCatalog } from "../packages/postgres-persistence/src/catalog-loader.js";

loadEnvFile();

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), "utf8"));
}

const ruleset = loadJson("rulesets/domains/laptop-student-us/ruleset.json");
const profiles = loadJson("examples/scenario-profiles.json");

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
    throw new Error("No published catalog found. Run `npm run catalog:ingest` and `npm run catalog:publish` first.");
  }

  const scenarioResults = [];
  for (const profile of profiles) {
    const result = await executePlatformPipeline({
      profile,
      domainPack: laptopStudentUsDomainPack,
      publishedEntities: publishedCatalogState.entities,
      catalogVersion: publishedCatalogState.catalogVersion,
      publishRunId: publishedCatalogState.publishRunId,
      ruleset
    });

    scenarioResults.push({
      profileId: profile.id,
      major: profile.major,
      budgetUsd: profile.budgetUsd,
      status: result.decision.status,
      candidateCount: result.decision.candidateCount,
      cards: result.decision.cards.map((card) => ({
        cardType: card.cardType,
        entityId: card.entityId,
        title: card.title,
        priceUsd: card.priceUsd,
        resaleScore: card.resaleScore,
        fitState: card.fitState,
        offerCondition: card.offerCondition
      })),
      noResults: result.decision.noResults ?? null
    });
  }

  const outputDir = path.resolve("domains/laptop-student-us/generated");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "scenario-results.generated.json"),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      publishedCatalogSource: publishedCatalogState.source,
      catalogVersion: publishedCatalogState.catalogVersion,
      publishRunId: publishedCatalogState.publishRunId,
      scenarioCount: scenarioResults.length,
      scenarios: scenarioResults
    }, null, 2)
  );

  console.log(JSON.stringify({
    generatedFile: "domains/laptop-student-us/generated/scenario-results.generated.json",
    catalogVersion: publishedCatalogState.catalogVersion,
    scenarioCount: scenarioResults.length
  }, null, 2));
} finally {
  if (client) {
    await client.end();
  }
}
