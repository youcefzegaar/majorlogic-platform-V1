import fs from "node:fs";
import path from "node:path";
import { loadEnvFile } from "./env.js";
import { ingestCatalogSources } from "../packages/catalog-core/src/index.js";
import { laptopStudentUsDomainPack } from "../domains/laptop-student-us/domain-pack.js";
import { createPostgresClient, PostgresPlatformRepository } from "../packages/postgres-persistence/src/index.js";

loadEnvFile();

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), "utf8"));
}

const domainId = "laptop-student-us";
const sourceRecords = loadJson("domains/laptop-student-us/sources/market-sources.json");
const { rawObservations, normalizedObservations } = ingestCatalogSources({
  sourceRecords,
  domainPack: laptopStudentUsDomainPack
});

const generatedDir = path.resolve("domains/laptop-student-us/generated");
fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(
  path.join(generatedDir, "source-observations.generated.json"),
  JSON.stringify(normalizedObservations, null, 2)
);

let client = null;
if (process.env.DATABASE_URL) {
  client = await createPostgresClient(process.env.DATABASE_URL);
}

try {
  if (client) {
    const repository = new PostgresPlatformRepository(client);
    await repository.applyMigrations();
    await repository.registerSources({ domainId, sourceRecords });
    const runId = await repository.createIngestionRun({
      domainId,
      sourceCount: sourceRecords.length
    });
    await repository.saveSourceObservations({
      domainId,
      observations: normalizedObservations
    });
    await repository.completeIngestionRun({
      runId,
      normalizedCount: normalizedObservations.length
    });
  }

  console.log(JSON.stringify({
    domainId,
    sourceCount: sourceRecords.length,
    normalizedCount: normalizedObservations.length,
    generatedFile: "domains/laptop-student-us/generated/source-observations.generated.json"
  }, null, 2));
} finally {
  if (client) {
    await client.end();
  }
}
