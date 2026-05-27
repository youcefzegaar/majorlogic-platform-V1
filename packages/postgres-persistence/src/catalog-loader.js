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
  // Lazy DB fetch — runs at most once regardless of the resolution path taken.
  let _dbCache = null;
  const fromDb = async () => {
    if (_dbCache) return _dbCache;
    const [entities, run] = await Promise.all([
      repository.getPublishedEntities({ domainId }),
      repository.getLatestPublishRun({ domainId })
    ]);
    _dbCache = { entities, run };
    return _dbCache;
  };

  if (preferDatabase && repository) {
    const { entities, run } = await fromDb();
    if (entities.length) {
      return {
        source: "database",
        entities,
        catalogVersion: run?.catalog_version ?? null,
        publishRunId: run?.publish_run_id ?? null
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

  // Fallback: try DB even when preferDatabase=false (e.g. file missing after a failed build).
  if (repository) {
    const { entities, run } = await fromDb(); // uses cached result — no extra round-trip
    if (entities.length) {
      return {
        source: "database",
        entities,
        catalogVersion: run?.catalog_version ?? null,
        publishRunId: run?.publish_run_id ?? null
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
