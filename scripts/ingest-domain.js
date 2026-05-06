import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvFile } from "./env.js";
import { ingestCatalogSources } from "../packages/catalog-core/src/index.js";
import { createPostgresClient, PostgresPlatformRepository } from "../packages/postgres-persistence/src/index.js";

loadEnvFile();

async function run() {
  const args = process.argv.slice(2);
  let domainId = args.find(arg => arg.startsWith("--domain="))?.split("=")[1] ?? args[0];
  
  if (!domainId) {
    console.error("Usage: node scripts/ingest-domain.js --domain=<domainId>");
    process.exit(1);
  }

  const domainPackUri = pathToFileURL(path.resolve(`domains/${domainId}/domain-pack.js`)).href;
  const domainModule = await import(domainPackUri);
  const domainPack = Object.values(domainModule).find(v => v?.meta?.domainId === domainId);
  if (!domainPack) {
    throw new Error(`Invalid domain pack found in domains/${domainId}/domain-pack.js`);
  }

  const sourcesPath = path.resolve(`domains/${domainId}/sources/market-sources.json`);
  const sourcesRaw = await fs.promises.readFile(sourcesPath, "utf8");
  const sourceRecords = JSON.parse(sourcesRaw);

  const { rawObservations, normalizedObservations } = ingestCatalogSources({
    sourceRecords,
    domainPack
  });

  const generatedDir = path.resolve(`domains/${domainId}/generated`);
  await fs.promises.mkdir(generatedDir, { recursive: true });
  await fs.promises.writeFile(
    path.join(generatedDir, "source-observations.generated.json"),
    JSON.stringify(normalizedObservations, null, 2)
  );

  let client = null;
  if (process.env.DATABASE_URL) {
    client = await createPostgresClient(process.env.DATABASE_URL);
  }

  try {
    if (client) {
      console.log("[Ingest] Connected to DB. Initializing repository...");
      const repository = new PostgresPlatformRepository(client);
      console.log("[Ingest] Applying migrations...");
      // await repository.applyMigrations();
      console.log("[Ingest] Migrations applied. Registering sources...");
      await repository.registerSources({ domainId, sourceRecords });
      console.log("[Ingest] Sources registered. Creating ingestion run...");
      const runId = await repository.createIngestionRun({
        domainId,
        sourceCount: sourceRecords.length
      });
      console.log(`[Ingest] Ingestion run created: ${runId}. Saving observations...`);
      await repository.saveSourceObservations({
        domainId,
        observations: normalizedObservations
      });
      console.log("[Ingest] Observations saved. Completing ingestion run...");
      await repository.completeIngestionRun({
        runId,
        normalizedCount: normalizedObservations.length
      });
      console.log("[Ingest] Ingestion run completed.");
    }

    console.log(JSON.stringify({
      domainId,
      sourceCount: sourceRecords.length,
      normalizedCount: normalizedObservations.length,
      generatedFile: `domains/${domainId}/generated/source-observations.generated.json`
    }, null, 2));
  } finally {
    if (client) {
      await client.end();
    }
  }
}

run().catch(err => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
