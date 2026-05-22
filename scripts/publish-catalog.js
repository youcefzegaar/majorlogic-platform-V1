import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvFile } from "./env.js";
import { runCatalogPipeline } from "../packages/catalog-publish/src/index.js";
import { createPostgresClient, PostgresPlatformRepository } from "../packages/postgres-persistence/src/index.js";
import { resolveObservations } from "../packages/postgres-persistence/src/observation-loader.js";

loadEnvFile();

async function run() {
  console.log("Parse args...");
  const args = process.argv.slice(2);
  let domainId = args.find(arg => arg.startsWith("--domain="))?.split("=")[1] ?? args[0];
  
  if (!domainId) {
    console.error("Usage: node scripts/publish-catalog.js --domain=<domainId>");
    process.exit(1);
  }

  console.log("Importing domain pack:", domainId);
  const domainPackUri = pathToFileURL(path.resolve(`domains/${domainId}/domain-pack.js`)).href;
  const domainModule = await import(domainPackUri);
  const domainPack = Object.values(domainModule).find(v => v?.meta?.domainId === domainId);
  if (!domainPack) {
    throw new Error(`Invalid domain pack found in domains/${domainId}/domain-pack.js`);
  }

  const fitContextsPath = path.resolve(`rulesets/domains/${domainId}/fit-contexts.json`);
  const fitContextsRaw = await fs.promises.readFile(fitContextsPath, "utf8");
  const fitContexts = JSON.parse(fitContextsRaw);

  const catalogVersion = `v${new Date().toISOString().replace(/[:.]/g, "-")}`;

  console.log("Connecting to DB...");
  let client = null;
  let repository = null;
  if (process.env.DATABASE_URL) {
    client = await createPostgresClient(process.env.DATABASE_URL);
    repository = new PostgresPlatformRepository(client);
    // await repository.applyMigrations();
  }

  console.log("Running pipeline...");
  try {
    const observationState = await resolveObservations({
      repository,
      domainId,
      generatedFilePath: `domains/${domainId}/generated/source-observations.generated.json`,
      fallbackFilePath: `domains/${domainId}/source-observations.json`
    });

    const { publishedEntities, pipelineReport } = runCatalogPipeline({
      sourceRecords: observationState.observations,
      domainPack: domainPack,
      domainContext: { fitContexts },
      meta: {
          sourceId: "cli_publish_run",
          acquiredAt: new Date().toISOString()
      },
      qualityGates: { minConfidence: 0.50, minObservations: 1 }
    });

    const generatedDir = path.resolve(`domains/${domainId}/generated`);
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
      generatedFile: `domains/${domainId}/generated/published-catalog.generated.json`
    }, null, 2));
  } finally {
    if (client) {
      await client.end();
    }
  }
}

run().catch(err => {
  console.error("Publishing failed:", err);
  process.exit(1);
});
