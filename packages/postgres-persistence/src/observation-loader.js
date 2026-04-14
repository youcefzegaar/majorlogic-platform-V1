import fs from "node:fs";
import path from "node:path";

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export async function resolveObservations({
  repository = null,
  domainId,
  preferDatabase = false,
  generatedFilePath,
  fallbackFilePath
}) {
  if (preferDatabase && repository) {
    const databaseObservations = await repository.getLatestSourceObservations({ domainId });
    if (databaseObservations.length) {
      return {
        source: "database",
        observations: databaseObservations
      };
    }
  }

  const generated = readJsonIfExists(path.resolve(generatedFilePath));
  if (generated?.length) {
    return {
      source: "generated_file",
      observations: generated
    };
  }

  if (repository) {
    const databaseObservations = await repository.getLatestSourceObservations({ domainId });
    if (databaseObservations.length) {
      return {
        source: "database",
        observations: databaseObservations
      };
    }
  }

  const fallback = readJsonIfExists(path.resolve(fallbackFilePath)) ?? [];
  return {
    source: "fallback_file",
    observations: fallback
  };
}
