import fs from "node:fs";
import path from "node:path";

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export async function resolvePublishedCatalog({
  repository = null,
  domainId,
  preferDatabase = true,
  generatedFilePath
}) {
  if (preferDatabase && repository) {
    const activePublishRun = await repository.getLatestPublishRun({ domainId });
    const databaseEntities = await repository.getPublishedEntities({ domainId });
    if (databaseEntities.length) {
      return {
        source: "database",
        entities: databaseEntities,
        catalogVersion: activePublishRun?.catalog_version ?? null,
        publishRunId: activePublishRun?.publish_run_id ?? null
      };
    }
  }

  const generated = readJsonIfExists(path.resolve(generatedFilePath));
  if (generated?.length) {
    return {
      source: "generated_file",
      entities: generated,
      catalogVersion: generated[0]?.catalog_version ?? null,
      publishRunId: generated[0]?.publish_run_id ?? null
    };
  }

  if (repository) {
    const activePublishRun = await repository.getLatestPublishRun({ domainId });
    const databaseEntities = await repository.getPublishedEntities({ domainId });
    if (databaseEntities.length) {
      return {
        source: "database",
        entities: databaseEntities,
        catalogVersion: activePublishRun?.catalog_version ?? null,
        publishRunId: activePublishRun?.publish_run_id ?? null
      };
    }
  }

  return {
    source: "empty",
    entities: [],
    catalogVersion: null,
    publishRunId: null
  };
}
