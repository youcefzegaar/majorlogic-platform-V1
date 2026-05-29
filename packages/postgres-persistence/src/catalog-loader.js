import fs from "node:fs";
import path from "node:path";

const FRESHNESS_SLA_HOURS = Number(process.env.CATALOG_FRESHNESS_SLA_HOURS ?? 24);

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function computeFreshness(publishedAt) {
  if (!publishedAt) return { publishedAt: null, ageHours: null, isStale: true, slaHours: FRESHNESS_SLA_HOURS };
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
  return { publishedAt: new Date(publishedAt).toISOString(), ageHours: Math.round(ageHours * 10) / 10, isStale: ageHours > FRESHNESS_SLA_HOURS, slaHours: FRESHNESS_SLA_HOURS };
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
      const publishedAt = activePublishRun?.completed_at ?? activePublishRun?.created_at ?? null;
      return {
        source: "database",
        entities: databaseEntities,
        catalogVersion: activePublishRun?.catalog_version ?? null,
        publishRunId: activePublishRun?.publish_run_id ?? null,
        freshness: computeFreshness(publishedAt),
      };
    }
  }

  const generated = readJsonIfExists(path.resolve(generatedFilePath));
  if (generated?.length) {
    // Generated files use the first entity's publish timestamp if available
    const publishedAt = generated[0]?.publishedAt ?? generated[0]?.published_at ?? null;
    return {
      source: "generated_file",
      entities: generated,
      catalogVersion: generated[0]?.catalog_version ?? null,
      publishRunId: generated[0]?.publish_run_id ?? null,
      freshness: computeFreshness(publishedAt),
    };
  }

  if (repository) {
    const activePublishRun = await repository.getLatestPublishRun({ domainId });
    const databaseEntities = await repository.getPublishedEntities({ domainId });
    if (databaseEntities.length) {
      const publishedAt = activePublishRun?.completed_at ?? activePublishRun?.created_at ?? null;
      return {
        source: "database",
        entities: databaseEntities,
        catalogVersion: activePublishRun?.catalog_version ?? null,
        publishRunId: activePublishRun?.publish_run_id ?? null,
        freshness: computeFreshness(publishedAt),
      };
    }
  }

  return {
    source: "empty",
    entities: [],
    catalogVersion: null,
    publishRunId: null,
    freshness: computeFreshness(null),
  };
}
