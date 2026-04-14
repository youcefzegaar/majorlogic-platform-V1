import fs from "node:fs";
import path from "node:path";
import { loadEnvFile } from "./env.js";
import { runCatalogPipeline } from "../packages/catalog-publish/src/index.js";
import { laptopStudentUsDomainPack } from "../domains/laptop-student-us/domain-pack.js";
import { createPostgresClient, PostgresPlatformRepository } from "../packages/postgres-persistence/src/index.js";
import { resolveObservations } from "../packages/postgres-persistence/src/observation-loader.js";

loadEnvFile();

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), "utf8"));
}

const domainId = laptopStudentUsDomainPack.meta.domainId;
const fitContexts = loadJson("rulesets/domains/laptop-student-us/fit-contexts.json");
const catalogVersion = `v${new Date().toISOString().replace(/[:.]/g, "-")}`;

let client = null;
let repository = null;
if (process.env.DATABASE_URL) {
  client = await createPostgresClient(process.env.DATABASE_URL);
  repository = new PostgresPlatformRepository(client);
  await repository.applyMigrations();
}

try {
  const observationState = await resolveObservations({
    repository,
    domainId,
    generatedFilePath: "domains/laptop-student-us/generated/source-observations.generated.json",
    fallbackFilePath: "domains/laptop-student-us/source-observations.json"
  });

  const { publishedEntities, pipelineReport } = runCatalogPipeline({
    sourceRecords: observationState.observations,
    domainPack: laptopStudentUsDomainPack,
    domainContext: { fitContexts },
    meta: {
        sourceId: "cli_publish_run",
        acquiredAt: new Date().toISOString()
    },
    qualityGates: { minConfidence: 0.50, minObservations: 1 }
  });

  const generatedDir = path.resolve("domains/laptop-student-us/generated");
  fs.mkdirSync(generatedDir, { recursive: true });
  fs.writeFileSync(
    path.join(generatedDir, "published-catalog.generated.json"),
    JSON.stringify(publishedEntities, null, 2)
  );

  if (repository) {
    const publishRunId = await repository.createPublishRun({
      domainId,
      catalogVersion,
      sourceObservationCount: pipelineReport.totalObservations,
      observationSource: observationState.source
    });

    await repository.publishEntities({
      domainId,
      entities: publishedEntities,
      publishRunId,
      catalogVersion
    });

    await repository.completePublishRun({
      runId: publishRunId,
      publishedEntityCount: publishedEntities.length
    });
  }

  console.log(JSON.stringify({
    domainId,
    catalogVersion,
    observationSource: observationState.source,
    pipelineReport,
    generatedFile: "domains/laptop-student-us/generated/published-catalog.generated.json"
  }, null, 2));
} finally {
  if (client) {
    await client.end();
  }
}
