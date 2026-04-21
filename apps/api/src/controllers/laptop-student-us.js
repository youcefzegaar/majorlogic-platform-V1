/**
 * Laptop Student US — Domain Controller
 *
 * يحتوي على كل المنطق الخاص بمجال اللابتوبات الطلابية:
 *   - تعريف التخصصات المتاحة (MAJOR_OPTIONS)
 *   - بناء حالة البحث من Query Params (buildSearchState)
 *   - تشغيل محرك القرار (runPipeline)
 *   - توفير بيانات لوحة الإدارة (buildAdminDashboardData)
 *
 * server.js لا يحتوي على أي منطق خاص باللابتوبات — فقط يستدعي هذا الملف.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { executePlatformPipeline } from "../../../../packages/platform-core/src/index.js";
import { laptopStudentUsDomainPack } from "../../../../domains/laptop-student-us/domain-pack.js";
import { resolvePublishedCatalog } from "../../../../packages/postgres-persistence/src/catalog-loader.js";
import { getRuleset, getRepository } from "../db/repository.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../..");

// ─────────────────────────────────────────────
// Domain Metadata
// ─────────────────────────────────────────────

export const DOMAIN_ID = laptopStudentUsDomainPack.meta.domainId;

export const MAJOR_OPTIONS = [
  { value: "computer_science",       label: "Computer Science",       engineMajor: "cs" },
  { value: "mechanical_engineering", label: "Mechanical Engineering", engineMajor: "engineering" },
  { value: "electrical_engineering", label: "Electrical Engineering", engineMajor: "engineering" },
  { value: "general_engineering",    label: "General Engineering",    engineMajor: "engineering" },
  { value: "design_creative",        label: "Design / Creative",      engineMajor: "design" }
];

// ─────────────────────────────────────────────
// Normalization Helpers
// ─────────────────────────────────────────────

function normalizePreferenceScale(value, fallback = 5) {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : Math.min(10, Math.max(0, Math.round(n)));
}

function normalizeBudget(value, fallback = 1400) {
  const n = Number(value);
  return Number.isNaN(n) ? fallback : Math.max(300, Math.round(n));
}

function parseBooleanFlag(value, fallback = false) {
  if (value === null || value === undefined || value === "") return fallback;
  const v = String(value).toLowerCase();
  return v === "true" || v === "1" || v === "on" || v === "yes";
}

// ─────────────────────────────────────────────
// buildSearchState — pure, testable
// ─────────────────────────────────────────────

export function buildSearchState(searchParams, defaultProfile) {
  const defaultMajor =
    MAJOR_OPTIONS.find((o) => o.engineMajor === defaultProfile.major) ?? MAJOR_OPTIONS[0];
  const majorOption =
    MAJOR_OPTIONS.find((o) => o.value === (searchParams.get("major") ?? defaultMajor.value)) ??
    MAJOR_OPTIONS[0];

  const portabilityScore = normalizePreferenceScale(
    searchParams.get("portabilityScore"),
    Math.round((defaultProfile.preferences?.portability ?? 50) / 10)
  );
  const batteryScore = normalizePreferenceScale(
    searchParams.get("batteryScore"),
    Math.round((defaultProfile.preferences?.battery ?? 50) / 10)
  );

  const inferredPreference =
    batteryScore >= 8 ? "battery_first" :
    portabilityScore >= 8 ? "portability_first" : "safe_balanced";

  const performancePreference =
    searchParams.get("performancePreference") ?? inferredPreference;

  const uiState = {
    major:               majorOption.value,
    majorLabel:          majorOption.label,
    budgetUsd:           normalizeBudget(searchParams.get("budgetUsd"), defaultProfile.budgetUsd),
    stretchBudget:       parseBooleanFlag(searchParams.get("stretchBudget"), false),
    performancePreference,
    osPreference:        searchParams.get("osPreference") ?? "windows_preferred",
    screenSize:          searchParams.get("screenSize") ?? "14_16",
    portabilityScore,
    batteryScore,
    portabilityImportance: portabilityScore * 10,
    batteryImportance:     batteryScore * 10,
    toolAi:    parseBooleanFlag(searchParams.get("toolAi"), true),
    toolVms:   parseBooleanFlag(searchParams.get("toolVms"), (defaultProfile.sliders?.virtual_machines ?? 0) > 50),
    toolCad:   parseBooleanFlag(searchParams.get("toolCad"), defaultProfile.major === "engineering"),
    toolAdobe: parseBooleanFlag(searchParams.get("toolAdobe"), defaultProfile.major === "design"),
    toolGaming:parseBooleanFlag(searchParams.get("toolGaming"), (defaultProfile.sliders?.gaming ?? 0) > 30),
    intent:    searchParams.get("intent") ?? "Reliable for coding, long battery, enough power for AI work."
  };

  const performanceMap = {
    safe_balanced:     { display: 55, resale: 72, gaming: 18, video_4k: 15 },
    performance_first: { display: 60, resale: 58, gaming: 55, video_4k: 48 },
    battery_first:     { display: 50, resale: 76, gaming: 10, video_4k: 12 },
    portability_first: { display: 48, resale: 70, gaming:  8, video_4k: 10 }
  };
  const perf = performanceMap[performancePreference] ?? performanceMap.safe_balanced;
  const stretchDelta = uiState.stretchBudget ? 180 : 0;

  const hasInputs = ["major", "budgetUsd", "performancePreference", "osPreference", "intent"]
    .some((k) => searchParams.has(k));

  const profile = {
    id: `web_${Date.now()}`,
    major: majorOption.engineMajor,
    budgetUsd: uiState.budgetUsd + stretchDelta,
    preferences: {
      portability: uiState.portabilityImportance,
      battery:     uiState.batteryImportance,
      display:     perf.display,
      resale:      perf.resale
    },
    sliders: {
      virtual_machines: uiState.toolVms    ? 82 : 25,
      video_4k:         uiState.toolAdobe  ? 72 : perf.video_4k,
      gaming:           uiState.toolGaming ? 82 : perf.gaming,
      portability:      performancePreference === "portability_first" ? 88 : uiState.portabilityImportance
    },
    context: {
      acceptsOpenBox:    parseBooleanFlag(searchParams.get("acceptsOpenBox"),    false),
      acceptsRefurbished:parseBooleanFlag(searchParams.get("acceptsRefurbished"),false),
      financingAllowed:  parseBooleanFlag(searchParams.get("financingAllowed"),  true)
    },
    productIntent: {
      performancePreference,
      osPreference: uiState.osPreference,
      screenSize:   uiState.screenSize,
      naturalLanguageIntent: uiState.intent
    }
  };

  return { hasInputs, profile, uiState };
}

// ─────────────────────────────────────────────
// runPipeline — with error boundary
// ─────────────────────────────────────────────

export async function runPipeline(profile) {
  try {
    const ruleset   = await getRuleset("rulesets/domains/laptop-student-us/ruleset.json");
    const repository = await getRepository();

    const publishedCatalogState = await resolvePublishedCatalog({
      repository,
      domainId: DOMAIN_ID,
      generatedFilePath: path.join(root, "domains/laptop-student-us/generated/published-catalog.generated.json")
    });

    if (!publishedCatalogState.entities.length) {
      return {
        error: "published_catalog_missing",
        message: "Run catalog ingestion and publishing before decision execution."
      };
    }

    const result = await executePlatformPipeline({
      profile,
      domainPack:       laptopStudentUsDomainPack,
      publishedEntities:publishedCatalogState.entities,
      catalogVersion:   publishedCatalogState.catalogVersion,
      publishRunId:     publishedCatalogState.publishRunId,
      ruleset,
      repository
    });

    return { publishedCatalogSource: publishedCatalogState.source, ...result };

  } catch (err) {
    const isDbError = err.code === "ECONNRESET" || err.code === "57P01" || err.code === "08006";
    if (isDbError) {
      return { error: "db_unavailable", message: "Database connection interrupted. Try again shortly.", retryable: true };
    }
    console.error("[runPipeline] error:", err.message);
    return { error: "pipeline_failed", message: err.message };
  }
}

// ─────────────────────────────────────────────
// Admin Data Aggregator
// ─────────────────────────────────────────────

export async function buildAdminDashboardData() {
  const repository = await getRepository();
  if (!repository) return null;

  const [overview, latestDecision, publishedEntities] = await Promise.all([
    repository.getAdminOverview({ domainId: DOMAIN_ID }),
    repository.getLatestDecisionDetails({ domainId: DOMAIN_ID }),
    repository.getPublishedEntitySnapshot({ domainId: DOMAIN_ID, limit: 12 })
  ]);

  return { domainId: DOMAIN_ID, overview, latestDecision, publishedEntities };
}
