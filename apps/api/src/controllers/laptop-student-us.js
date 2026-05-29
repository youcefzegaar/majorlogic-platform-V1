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
import { executeUniversalPipeline } from "../../../../packages/platform-core/src/index.js";
import { laptopStudentUsDomainPack } from "../../../../domains/laptop-student-us/domain-pack.js";
import { findRenewedOpportunityCard } from "../../../../domains/laptop-student-us/card-builder.js";
import { resolvePublishedCatalog } from "../../../../packages/postgres-persistence/src/catalog-loader.js";
import { getRuleset, getRepository } from "../db/repository.js";
import { getGeminiConfig, getClaudeConfig } from "../services/integrationService.js";

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

  const locale = searchParams.get("locale") ?? searchParams.get("lang") ?? defaultProfile.locale ?? "en";

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
    locale,
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
    locale,
    budgetUsd: uiState.budgetUsd + stretchDelta,
    preferences: {
      portability: uiState.portabilityImportance,
      battery:     uiState.batteryImportance,
      display:     perf.display,
      resale:      perf.resale
    },
    sliders: {
      // Graduated intent scaling — not binary on/off.
      // "I use VMs" signals strong need (75), not maximum (82).
      // "I don't use VMs" signals low need (20), not zero (0).
      // This preserves the nuance the decision kernel needs for accurate conflict detection.
      virtual_machines: uiState.toolVms    ? 75 : 20,
      video_4k:         uiState.toolAdobe  ? 68 : Math.round(perf.video_4k * 0.9),
      gaming:           uiState.toolGaming ? 72 : Math.round(perf.gaming   * 0.9),
      portability:      performancePreference === "portability_first" ? 85 : uiState.portabilityImportance
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
// AI Provider — Gemini → Claude → null fallback
// ─────────────────────────────────────────────

async function buildAIProvider() {
  // 1. Try Gemini first (cheaper, faster for short narratives)
  try {
    const cfg = await getGeminiConfig();
    if (cfg) {
      const { GeminiProvider } = await import("../../../../packages/ai-provider-gemini/src/index.js");
      return new GeminiProvider(cfg.apiKey, { modelName: cfg.modelName });
    }
  } catch { /* package not installed or key invalid — continue */ }

  // 2. Fallback to Claude if Gemini not configured
  try {
    const cfg = await getClaudeConfig();
    if (cfg) {
      // Minimal Claude wrapper implementing the aiProvider interface
      return {
        async generate(prompt) {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": cfg.apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json"
            },
            body: JSON.stringify({
              model: cfg.model,
              max_tokens: cfg.maxTokens ?? 250,
              messages: [{ role: "user", content: prompt }]
            })
          });
          if (!res.ok) throw new Error(`Claude API ${res.status}`);
          const data = await res.json();
          return data.content?.[0]?.text?.trim() ?? "";
        }
      };
    }
  } catch { /* key invalid or network error */ }

  return null; // no AI configured — templates will be used
}

// ─────────────────────────────────────────────
// runPipeline — with error boundary
// ─────────────────────────────────────────────

export async function runPipeline(profile) {
  try {
    const ruleset   = await getRuleset("domains/laptop-student-us/decision-config.json");
    const repository = await getRepository();

    const publishedCatalogState = await resolvePublishedCatalog({
      repository,
      domainId: DOMAIN_ID,
      preferDatabase: false,
      generatedFilePath: path.join(root, "domains/laptop-student-us/generated/published-catalog.generated.json")
    });

    if (!publishedCatalogState.entities.length) {
      return {
        error: "published_catalog_missing",
        message: "Run catalog ingestion and publishing before decision execution."
      };
    }

    // Load AI provider from admin integrations (Gemini → Claude → null)
    const aiProvider = await buildAIProvider();

    // Enable AI narratives in the config only when a provider is available
    const decisionConfig = aiProvider
      ? { ...ruleset, useAI: true }
      : ruleset;

    const result = await executeUniversalPipeline({
      profile,
      domainPack:        laptopStudentUsDomainPack,
      publishedEntities: publishedCatalogState.entities,
      catalogVersion:    publishedCatalogState.catalogVersion,
      publishRunId:      publishedCatalogState.publishRunId,
      catalogFreshness:  publishedCatalogState.freshness ?? null,
      decisionConfig,
      repository,
      aiProvider
    });

    // Post-pipeline: surface devices excluded by new price but accessible via renewed
    const heroCard = result.decision?.cards?.find(c => c.cardType === 'hero');
    if (heroCard && publishedCatalogState.entities?.length && result.decision?.cards) {
      const renewedOpp = findRenewedOpportunityCard(
        profile,
        publishedCatalogState.entities,
        heroCard,
        laptopStudentUsDomainPack.ownershipConfig
      );
      if (renewedOpp) result.decision.cards.push(renewedOpp);
    }

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
