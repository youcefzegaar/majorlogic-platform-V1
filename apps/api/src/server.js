import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "../../../scripts/env.js";
import { executePlatformPipeline } from "../../../packages/platform-core/src/index.js";
import { laptopStudentUsDomainPack } from "../../../domains/laptop-student-us/domain-pack.js";
import { createPostgresClient, PostgresPlatformRepository } from "../../../packages/postgres-persistence/src/index.js";
import { resolvePublishedCatalog } from "../../../packages/postgres-persistence/src/catalog-loader.js";
import { renderSearchPage as newRenderSearchPage, renderResultsPage as newRenderResultsPage } from "./views/templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
let repositoryPromise = null;
const HTML_SENTINEL = "__html_sent__";
const port = Number(process.env.PORT ?? 3010);
loadEnvFile(path.join(root, ".env"));

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

const defaultProfile = loadJson("examples/profile.json");
const scenarioProfiles = loadJson("examples/scenario-profiles.json");

function readGeneratedScenarioResults() {
  const scenarioFile = path.join(root, "domains/laptop-student-us/generated/scenario-results.generated.json");
  if (!fs.existsSync(scenarioFile)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(scenarioFile, "utf8"));
}

async function getRepository() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      const client = await createPostgresClient(process.env.DATABASE_URL);
      const repository = new PostgresPlatformRepository(client);
      await repository.applyMigrations();
      return repository;
    })();
  }

  return repositoryPromise;
}

async function runPipeline(profile) {
  const ruleset = loadJson("rulesets/domains/laptop-student-us/ruleset.json");
  const repository = await getRepository();
  const publishedCatalogState = await resolvePublishedCatalog({
    repository,
    domainId: laptopStudentUsDomainPack.meta.domainId,
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
    domainPack: laptopStudentUsDomainPack,
    publishedEntities: publishedCatalogState.entities,
    catalogVersion: publishedCatalogState.catalogVersion,
    publishRunId: publishedCatalogState.publishRunId,
    ruleset,
    repository
  });

  return {
    publishedCatalogSource: publishedCatalogState.source,
    ...result
  };
}

async function buildAdminDashboardData() {
  const repository = await getRepository();
  if (!repository) {
    return null;
  }

  const domainId = laptopStudentUsDomainPack.meta.domainId;
  const overview = await repository.getAdminOverview({ domainId });
  const latestDecision = await repository.getLatestDecisionDetails({ domainId });
  const publishedEntities = await repository.getPublishedEntitySnapshot({ domainId, limit: 12 });

  return {
    domainId,
    overview,
    latestDecision,
    publishedEntities,
    scenarios: readGeneratedScenarioResults()
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePercent(value, fallback = 50) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function normalizePreferenceScale(value, fallback = 5) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }

  return Math.min(10, Math.max(0, Math.round(numeric)));
}

function normalizeBudget(value, fallback = 1400) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }

  return Math.max(300, Math.round(numeric));
}

function parseBooleanFlag(value, fallback = false) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const normalized = String(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on" || normalized === "yes";
}

const MAJOR_OPTIONS = [
  { value: "computer_science", label: "Computer Science", engineMajor: "cs" },
  { value: "mechanical_engineering", label: "Mechanical Engineering", engineMajor: "engineering" },
  { value: "electrical_engineering", label: "Electrical Engineering", engineMajor: "engineering" },
  { value: "general_engineering", label: "General Engineering", engineMajor: "engineering" },
  { value: "design_creative", label: "Design / Creative", engineMajor: "design" }
];

function findMajorOption(value) {
  return MAJOR_OPTIONS.find((option) => option.value === value) ?? MAJOR_OPTIONS[0];
}

function buildSearchState(searchParams) {
  const defaultMajor = MAJOR_OPTIONS.find((option) => option.engineMajor === defaultProfile.major) ?? MAJOR_OPTIONS[0];
  const majorOption = findMajorOption(searchParams.get("major") ?? defaultMajor.value);
  const uiState = {
    major: majorOption.value,
    majorLabel: majorOption.label,
    budgetUsd: normalizeBudget(searchParams.get("budgetUsd"), defaultProfile.budgetUsd),
    stretchBudget: parseBooleanFlag(searchParams.get("stretchBudget"), false),
    performancePreference: searchParams.get("performancePreference") ?? "safe_balanced",
    osPreference: searchParams.get("osPreference") ?? "windows_preferred",
    screenSize: searchParams.get("screenSize") ?? "14_16",
    portabilityScore: normalizePreferenceScale(searchParams.get("portabilityScore"), Math.round(defaultProfile.preferences.portability / 10)),
    batteryScore: normalizePreferenceScale(searchParams.get("batteryScore"), Math.round(defaultProfile.preferences.battery / 10)),
    toolAi: parseBooleanFlag(searchParams.get("toolAi"), true),
    toolVms: parseBooleanFlag(searchParams.get("toolVms"), defaultProfile.sliders.virtual_machines > 50),
    toolCad: parseBooleanFlag(searchParams.get("toolCad"), defaultProfile.major === "engineering"),
    toolAdobe: parseBooleanFlag(searchParams.get("toolAdobe"), defaultProfile.major === "design"),
    toolGaming: parseBooleanFlag(searchParams.get("toolGaming"), defaultProfile.sliders.gaming > 30),
    intent: searchParams.get("intent") ?? "I want something reliable for coding, long battery for campus, and enough power for AI work."
  };

  uiState.portabilityImportance = uiState.portabilityScore * 10;
  uiState.batteryImportance = uiState.batteryScore * 10;

  const inferredPreference = uiState.batteryScore >= 8
    ? "battery_first"
    : uiState.portabilityScore >= 8
      ? "portability_first"
      : "safe_balanced";
  uiState.performancePreference = searchParams.get("performancePreference") ?? inferredPreference;

  const hasInputs = [
    "major",
    "budgetUsd",
    "performancePreference",
    "osPreference",
    "intent"
  ].some((key) => searchParams.has(key));

  const stretchDelta = uiState.stretchBudget ? 180 : 0;
  const performanceMap = {
    safe_balanced: { display: 55, resale: 72, gaming: 18, video_4k: 15 },
    performance_first: { display: 60, resale: 58, gaming: 55, video_4k: 48 },
    battery_first: { display: 50, resale: 76, gaming: 10, video_4k: 12 },
    portability_first: { display: 48, resale: 70, gaming: 8, video_4k: 10 }
  };
  const selectedPerformance = performanceMap[uiState.performancePreference] ?? performanceMap.safe_balanced;

  const profile = {
    id: `web_${Date.now()}`,
    major: majorOption.engineMajor,
    budgetUsd: uiState.budgetUsd + stretchDelta,
    preferences: {
      portability: uiState.portabilityImportance,
      battery: uiState.batteryImportance,
      display: selectedPerformance.display,
      resale: selectedPerformance.resale
    },
    sliders: {
      virtual_machines: uiState.toolVms ? 82 : 25,
      video_4k: uiState.toolAdobe ? 72 : selectedPerformance.video_4k,
      gaming: uiState.toolGaming ? 82 : selectedPerformance.gaming,
      portability: uiState.performancePreference === "portability_first" ? 88 : uiState.portabilityImportance
    },
    context: {
      acceptsOpenBox: parseBooleanFlag(searchParams.get("acceptsOpenBox"), false),
      acceptsRefurbished: parseBooleanFlag(searchParams.get("acceptsRefurbished"), false),
      financingAllowed: parseBooleanFlag(searchParams.get("financingAllowed"), true)
    },
    productIntent: {
      performancePreference: uiState.performancePreference,
      osPreference: uiState.osPreference,
      screenSize: uiState.screenSize,
      naturalLanguageIntent: uiState.intent
    }
  };

  return { hasInputs, profile, uiState };
}

function uiShellTemplate({ title, body, pageClass = "" }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f9fc;
        --ink: #122033;
        --muted: #607086;
        --panel: rgba(255,255,255,0.96);
        --panel-strong: #ffffff;
        --navy: #0f2b5b;
        --navy-soft: rgba(15, 43, 91, 0.08);
        --teal: #1db7b5;
        --cyan: #50d5d1;
        --border: #e6ecf2;
        --shadow: 0 18px 44px rgba(18, 32, 51, 0.08);
        --shadow-soft: 0 10px 24px rgba(18, 32, 51, 0.05);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Segoe UI", "Tahoma", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(29, 183, 181, 0.08), transparent 18rem),
          radial-gradient(circle at top right, rgba(15, 43, 91, 0.06), transparent 18rem),
          linear-gradient(180deg, #fbfcff 0%, var(--bg) 100%);
      }
      a { color: inherit; text-decoration: none; }
      main {
        max-width: 1220px;
        margin: 0 auto;
        padding: 24px 16px 48px;
      }
      .shell {
        min-height: calc(100vh - 48px);
      }
      .top-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 24px;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        font-weight: 800;
        font-size: 1.8rem;
        letter-spacing: -0.03em;
      }
      .brand-mark {
        width: 46px;
        height: 46px;
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 900;
        font-size: 1rem;
        background: linear-gradient(135deg, var(--navy), var(--teal));
        box-shadow: 0 14px 30px rgba(15, 43, 91, 0.18);
      }
      .trust-strip {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .trust-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 9px 13px;
        border-radius: 999px;
        background: rgba(255,255,255,0.92);
        border: 1px solid var(--border);
        color: var(--muted);
        font-size: 0.88rem;
        font-weight: 600;
        box-shadow: var(--shadow-soft);
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.74rem;
        color: var(--teal);
        font-weight: 700;
      }
      h1, h2, h3, h4, p { margin: 0; }
      h1 {
        font-size: clamp(2.8rem, 5vw, 4.8rem);
        line-height: 0.92;
        margin-top: 12px;
        letter-spacing: -0.04em;
      }
      .lead {
        margin-top: 16px;
        font-size: 1.06rem;
        line-height: 1.8;
        color: var(--muted);
        max-width: 44rem;
      }
      .panel, .hero-panel, .feature-card, .result-card, .summary-bar, .compare-table, .trust-block, .warning-block {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 28px;
        box-shadow: var(--shadow);
      }
      .search-hero {
        display: grid;
        grid-template-columns: 1.05fr 0.95fr;
        gap: 24px;
        align-items: stretch;
      }
      .hero-panel {
        padding: 34px;
      }
      .hero-side {
        display: grid;
        align-items: stretch;
      }
      .feature-card {
        padding: 28px;
        overflow: hidden;
        position: relative;
        background:
          radial-gradient(circle at top right, rgba(80, 213, 209, 0.24), transparent 10rem),
          linear-gradient(145deg, rgba(255,255,255,0.98), rgba(243,248,255,0.92));
      }
      .feature-card::before {
        content: "";
        position: absolute;
        right: -16px;
        bottom: -18px;
        width: 260px;
        height: 160px;
        border-radius: 26px;
        background: linear-gradient(145deg, rgba(15, 43, 91, 0.14), rgba(29, 183, 181, 0.20));
        transform: rotate(-11deg);
      }
      .feature-card::after {
        content: "";
        position: absolute;
        left: 40px;
        right: 80px;
        bottom: 30px;
        height: 18px;
        border-radius: 999px;
        background: rgba(15, 43, 91, 0.10);
        filter: blur(8px);
      }
      .feature-copy {
        position: relative;
        z-index: 1;
        max-width: 280px;
      }
      .feature-laptop {
        position: absolute;
        right: 42px;
        bottom: 42px;
        width: 210px;
        height: 132px;
        border-radius: 20px 20px 16px 16px;
        background: linear-gradient(160deg, #fefefe, #d9e3f5);
        border: 1px solid rgba(15, 43, 91, 0.10);
        box-shadow: 0 24px 40px rgba(15, 43, 91, 0.12);
        transform: perspective(900px) rotateX(8deg) rotateY(-20deg);
      }
      .feature-screen {
        position: absolute;
        inset: 10px;
        border-radius: 14px;
        background: linear-gradient(145deg, rgba(15,43,91,0.88), rgba(80,213,209,0.55));
      }
      .feature-base {
        position: absolute;
        left: -14px;
        right: -14px;
        bottom: -10px;
        height: 12px;
        border-radius: 0 0 16px 16px;
        background: linear-gradient(180deg, #dfe7f3, #bcc8da);
      }
      .search-grid {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 16px;
        margin-top: 28px;
      }
      .input-card {
        padding: 28px;
      }
      .section-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }
      form {
        display: grid;
        gap: 22px;
      }
      .form-group {
        display: grid;
        gap: 12px;
      }
      .field-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      label {
        display: grid;
        gap: 8px;
        font-size: 0.9rem;
        color: var(--muted);
      }
      input, select, textarea {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 13px 15px;
        font: inherit;
        color: var(--ink);
        background: rgba(255,255,255,0.98);
        transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
      }
      input:focus, select:focus, textarea:focus {
        outline: none;
        border-color: rgba(29, 183, 181, 0.55);
        box-shadow: 0 0 0 4px rgba(29, 183, 181, 0.10);
      }
      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        padding: 0;
        accent-color: var(--teal);
      }
      .toggle-row, .chip-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .check {
        display: flex;
        gap: 10px;
        align-items: center;
        color: var(--ink);
        background: rgba(255,255,255,0.88);
        border-radius: 16px;
        padding: 10px 12px;
        border: 1px solid var(--border);
        box-shadow: var(--shadow-soft);
      }
      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      button, .button-link {
        border: 0;
        border-radius: 999px;
        padding: 12px 18px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      button {
        color: white;
        background: linear-gradient(135deg, var(--navy), var(--teal));
        box-shadow: 0 14px 30px rgba(15, 43, 91, 0.18);
      }
      .button-link {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.82);
      }
      .support-note {
        color: var(--muted);
        font-size: 0.92rem;
      }
      .mini-section {
        margin-top: 28px;
      }
      .how-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-top: 16px;
      }
      .how-card {
        padding: 20px;
        border-radius: 22px;
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.9);
        box-shadow: var(--shadow-soft);
      }
      .results-stack {
        display: grid;
        gap: 18px;
      }
      .summary-bar {
        padding: 18px 22px;
        position: sticky;
        top: 12px;
        z-index: 5;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
        margin-top: 12px;
      }
      .summary-item {
        padding: 12px 14px;
        border-radius: 18px;
        background: rgba(247,249,252,0.92);
        border: 1px solid var(--border);
      }
      .result-hero {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: 18px;
      }
      .result-card {
        padding: 26px;
      }
      .result-card ul, .alt-card ul, .trust-block ul, .warning-block ul {
        margin: 10px 0 0;
        padding-left: 18px;
        color: var(--muted);
      }
      .hero-visual {
        min-height: 360px;
        border-radius: 26px;
        position: relative;
        overflow: hidden;
        background:
          radial-gradient(circle at top right, rgba(80, 213, 209, 0.28), transparent 10rem),
          linear-gradient(145deg, #fafdff, #eef5ff);
        border: 1px solid var(--border);
      }
      .hero-laptop {
        position: absolute;
        left: 48px;
        right: 62px;
        bottom: 72px;
        height: 180px;
        border-radius: 24px 24px 16px 16px;
        background: linear-gradient(160deg, #ffffff, #d8e3f4);
        border: 1px solid rgba(15, 43, 91, 0.10);
        box-shadow: 0 26px 46px rgba(15, 43, 91, 0.12);
        transform: perspective(1000px) rotateX(8deg) rotateY(-18deg);
      }
      .hero-screen {
        position: absolute;
        inset: 12px;
        border-radius: 16px;
        background: linear-gradient(150deg, rgba(15,43,91,0.95), rgba(29,183,181,0.55));
      }
      .hero-base {
        position: absolute;
        left: -18px;
        right: -18px;
        bottom: -14px;
        height: 16px;
        border-radius: 0 0 18px 18px;
        background: linear-gradient(180deg, #d6e0f0, #b8c5d9);
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(15, 43, 91, 0.06);
        color: var(--navy);
        font-weight: 700;
        font-size: 0.88rem;
      }
      .reason-list {
        display: grid;
        gap: 10px;
        margin-top: 16px;
      }
      .reason-item {
        padding: 12px 14px;
        border-radius: 18px;
        border: 1px solid var(--border);
        background: rgba(247,249,252,0.9);
      }
      .cta-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 18px;
      }
      .alt-stack {
        display: grid;
        gap: 14px;
      }
      .alt-card {
        padding: 18px;
        border-radius: 24px;
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.96);
        box-shadow: var(--shadow-soft);
      }
      .alt-card-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .alt-thumb {
        width: 96px;
        height: 64px;
        border-radius: 16px;
        object-fit: cover;
        background: #f2f6fb;
        border: 1px solid rgba(15,43,91,0.10);
      }
      .section-grid {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 18px;
      }
      .product-photo {
        width: 100%;
        height: 100%;
        object-fit: contain;
        padding: 22px;
        position: relative;
        z-index: 1;
      }
      .results-no-text {
        margin-top: 0;
      }
      .compare-table, .trust-block, .warning-block {
        padding: 22px;
      }
      .metric-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }
      .metric {
        border-radius: 18px;
        padding: 14px;
        background: rgba(247,249,252,0.9);
        border: 1px solid var(--border);
      }
      .metric-value {
        margin-top: 8px;
        font-size: 1.4rem;
        color: var(--navy);
      }
      .muted { color: var(--muted); }
      .scenario-links {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .scenario-link {
        padding: 8px 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.9);
        border: 1px solid var(--border);
        font-size: 0.88rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 14px;
      }
      th, td {
        text-align: left;
        padding: 12px 10px;
        border-bottom: 1px solid var(--border);
        vertical-align: top;
      }
      th {
        color: var(--muted);
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .accordion {
        margin-top: 16px;
        padding: 16px 18px;
        border-radius: 20px;
        border: 1px solid var(--border);
        background: rgba(247,249,252,0.92);
      }
      .table-mobile {
        display: none;
      }
      .mobile-compare-card {
        padding: 16px;
        border-radius: 20px;
        background: rgba(247,249,252,0.92);
        border: 1px solid var(--border);
        margin-top: 12px;
      }
      @media (max-width: 1080px) {
        .search-hero, .result-hero, .section-grid, .layout {
          grid-template-columns: 1fr;
        }
        .summary-grid, .metric-grid, .how-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 720px) {
        .field-grid, .search-grid, .summary-grid, .metric-grid, .how-grid {
          grid-template-columns: 1fr;
        }
        .feature-card {
          min-height: 260px;
        }
        .feature-laptop {
          width: 170px;
          height: 108px;
          right: 22px;
          bottom: 28px;
        }
        .table-desktop {
          display: none;
        }
        .table-mobile {
          display: block;
        }
      }
      .ml-window {
        max-width: 1120px;
        margin: 12px auto 0;
        background: rgba(255,255,255,0.98);
        border: 1px solid rgba(15, 43, 91, 0.12);
        border-radius: 28px;
        box-shadow: 0 28px 60px rgba(18, 32, 51, 0.10);
        overflow: hidden;
      }
      .ml-window-bar {
        height: 54px;
        padding: 0 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #1f232d;
        color: #ffffff;
      }
      .ml-window-brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: 1.18rem;
        font-weight: 700;
      }
      .ml-window-brand-mark {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--navy), var(--teal));
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.78rem;
        font-weight: 800;
      }
      .ml-window-close {
        color: rgba(255,255,255,0.76);
        font-size: 1.25rem;
      }
      .ml-window-body {
        padding: 42px 48px;
      }
      .ml-search-shell {
        max-width: 900px;
        margin: 0 auto;
      }
      .ml-heading {
        font-size: clamp(2.6rem, 5vw, 4rem);
        line-height: 0.98;
        letter-spacing: -0.04em;
      }
      .ml-subheading {
        margin-top: 12px;
        color: var(--muted);
        font-size: 1.24rem;
      }
      .ml-divider {
        height: 1px;
        margin: 28px 0 24px;
        background: linear-gradient(90deg, rgba(15, 43, 91, 0.10), rgba(15, 43, 91, 0.03));
      }
      .ml-stack {
        display: grid;
        gap: 24px;
      }
      .ml-section-title {
        font-size: 1.28rem;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .ml-choice-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .ml-choice-grid.four {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .ml-choice {
        position: relative;
      }
      .ml-choice input {
        position: absolute;
        opacity: 0;
      }
      .ml-choice-body {
        min-height: 112px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: #f8fbff;
        box-shadow: 0 10px 22px rgba(18, 32, 51, 0.04);
        display: grid;
        place-items: center;
        gap: 8px;
        padding: 16px;
        text-align: center;
        transition: 160ms ease;
      }
      .ml-choice-symbol {
        font-size: 1.6rem;
        font-weight: 800;
        color: var(--navy);
      }
      .ml-choice-title {
        font-size: 0.98rem;
        font-weight: 700;
        line-height: 1.2;
      }
      .ml-choice-sub {
        font-size: 0.84rem;
        color: var(--muted);
      }
      .ml-choice input:checked + .ml-choice-body {
        background: linear-gradient(180deg, rgba(249,251,255,1), rgba(243,241,255,1));
        border-color: rgba(106, 74, 247, 0.34);
        box-shadow: 0 16px 28px rgba(87, 74, 196, 0.12);
      }
      .ml-budget-row {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 18px;
      }
      .ml-slider-card {
        border: 1px solid var(--border);
        border-radius: 18px;
        background: #fafcff;
        box-shadow: 0 10px 22px rgba(18, 32, 51, 0.04);
        padding: 18px 18px 16px;
      }
      .ml-slider-card + .ml-slider-card {
        margin-top: 12px;
      }
      .ml-slider-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      .ml-slider-title {
        font-size: 0.98rem;
        font-weight: 700;
      }
      .ml-slider-value {
        min-width: 46px;
        padding: 6px 12px;
        border-radius: 999px;
        background: linear-gradient(90deg, #6a4af7, #9f48ff);
        color: white;
        font-weight: 700;
        text-align: center;
      }
      .ml-range {
        width: 100%;
        accent-color: #7a51ff;
      }
      .ml-range-meta {
        margin-top: 8px;
        display: flex;
        justify-content: space-between;
        color: var(--muted);
        font-size: 0.84rem;
      }
      .ml-toggle-row {
        margin-top: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: var(--muted);
        font-size: 0.95rem;
      }
      .ml-toggle {
        position: relative;
        width: 56px;
        height: 32px;
      }
      .ml-toggle input {
        position: absolute;
        opacity: 0;
      }
      .ml-toggle-track {
        position: absolute;
        inset: 0;
        border-radius: 999px;
        background: #d7dfeb;
        transition: 160ms ease;
      }
      .ml-toggle-track::after {
        content: "";
        position: absolute;
        top: 4px;
        left: 4px;
        width: 24px;
        height: 24px;
        border-radius: 999px;
        background: white;
        box-shadow: 0 4px 12px rgba(18, 32, 51, 0.16);
        transition: 160ms ease;
      }
      .ml-toggle input:checked + .ml-toggle-track {
        background: linear-gradient(90deg, #4d7cff, #6d54ff);
      }
      .ml-toggle input:checked + .ml-toggle-track::after {
        transform: translateX(24px);
      }
      .ml-intuition textarea {
        width: 100%;
        min-height: 88px;
        border: 1px solid rgba(112, 72, 255, 0.35);
        border-radius: 16px;
        padding: 18px;
        font: inherit;
        color: var(--ink);
        resize: vertical;
        outline: none;
        box-shadow: 0 12px 20px rgba(112, 72, 255, 0.08);
      }
      .ml-submit {
        display: flex;
        justify-content: center;
      }
      .ml-submit button,
      .ml-action {
        border: none;
        border-radius: 999px;
        padding: 16px 30px;
        background: linear-gradient(90deg, #2b72ff 0%, #7c4dff 100%);
        color: white;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 16px 28px rgba(75, 88, 216, 0.24);
      }
      .ml-foot-note {
        text-align: center;
        color: var(--muted);
        font-size: 0.82rem;
      }
      .ml-hidden {
        display: none;
      }
      .ml-results-shell {
        display: grid;
        gap: 24px;
      }
      .ml-results-top {
        display: flex;
        justify-content: flex-end;
      }
      .ml-results-top .trust-strip {
        gap: 0;
      }
      .ml-results-top .trust-pill {
        border-radius: 0;
        box-shadow: none;
        background: #fff;
      }
      .ml-results-top .trust-pill:first-child {
        border-top-left-radius: 14px;
        border-bottom-left-radius: 14px;
      }
      .ml-results-top .trust-pill:last-child {
        border-top-right-radius: 14px;
        border-bottom-right-radius: 14px;
      }
      .ml-results-stage {
        display: grid;
        grid-template-columns: 1.1fr 1fr 0.9fr;
        gap: 22px;
        align-items: center;
      }
      .ml-results-copy {
        display: grid;
        gap: 16px;
      }
      .ml-results-title {
        font-size: clamp(2.8rem, 5vw, 4.1rem);
        line-height: 1.02;
        letter-spacing: -0.04em;
      }
      .ml-results-sub {
        color: var(--muted);
        font-size: 1.18rem;
      }
      .ml-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        padding: 8px 14px;
        border-radius: 999px;
        background: #fff8e8;
        color: #5d4922;
        border: 1px solid #f2dfac;
        font-size: 0.9rem;
        font-weight: 700;
      }
      .ml-hero-name {
        font-size: 2.3rem;
        font-weight: 700;
        letter-spacing: -0.03em;
        line-height: 1.08;
      }
      .ml-hero-tag {
        color: var(--muted);
        font-size: 1.1rem;
      }
      .ml-why h3 {
        font-size: 1.72rem;
        margin-bottom: 10px;
      }
      .ml-checks {
        display: grid;
        gap: 10px;
      }
      .ml-check {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ml-check::before {
        content: "✓";
        color: #2b72ff;
        font-weight: 800;
      }
      .ml-warning {
        color: #544f3a;
      }
      .ml-warning strong {
        color: #40371f;
      }
      .ml-hero-art img {
        width: 100%;
        max-width: 520px;
        height: auto;
        display: block;
        filter: drop-shadow(0 26px 36px rgba(15, 43, 91, 0.16));
      }
      .ml-side-stack {
        display: grid;
        gap: 16px;
      }
      .ml-side-card {
        border: 1px solid var(--border);
        border-radius: 22px;
        background: rgba(255,255,255,0.96);
        box-shadow: 0 18px 36px rgba(18, 32, 51, 0.08);
        padding: 18px;
        display: grid;
        gap: 10px;
      }
      .ml-side-head {
        display: grid;
        grid-template-columns: 1fr 108px;
        gap: 12px;
        align-items: center;
      }
      .ml-side-card img {
        width: 108px;
        height: 78px;
        object-fit: contain;
        justify-self: end;
      }
      .ml-side-card h4 {
        margin-top: 8px;
        font-size: 1.28rem;
        letter-spacing: -0.03em;
      }
      .ml-side-copy {
        color: var(--muted);
      }
      .ml-side-warning {
        color: #5e5435;
        font-size: 0.95rem;
      }
      .ml-side-link {
        justify-self: start;
        padding: 10px 16px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: #f9fbff;
        color: #2f5fa6;
        font-weight: 700;
      }
      @media (max-width: 980px) {
        .ml-budget-row,
        .ml-results-stage {
          grid-template-columns: 1fr;
        }
        .ml-choice-grid.four {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 720px) {
        .ml-window-body {
          padding: 28px 18px 24px;
        }
        .ml-choice-grid,
        .ml-choice-grid.four {
          grid-template-columns: 1fr;
        }
        .ml-side-head {
          grid-template-columns: 1fr;
        }
        .ml-side-card img {
          justify-self: start;
        }
      }
    </style>
  </head>
  <body class="${escapeHtml(pageClass)}">
    <main>
      <div class="top-nav">
        <div class="brand">
          <span class="brand-mark">ML</span>
          <span class="brand-copy">
            <span>MajorLogic</span>
            <small>Confident Decisions, Reduced Regret</small>
          </span>
        </div>
        <div class="trust-strip">
          <span class="trust-pill">No Ads</span>
          <span class="trust-pill">No Commission Bias</span>
          <span class="trust-pill">Rule-Based</span>
        </div>
      </div>
      <div class="shell">
        ${body}
      </div>
    </main>
  </body>
</html>`;
}

function buildScenarioHref(scenario) {
  const majorValue = MAJOR_OPTIONS.find((option) => option.engineMajor === scenario.major)?.value ?? "computer_science";
  const params = new URLSearchParams({
    major: majorValue,
    budgetUsd: String(scenario.budgetUsd),
    stretchBudget: "false",
    performancePreference: scenario.sliders.virtual_machines > 65 || scenario.sliders.gaming > 60 ? "performance_first" : "safe_balanced",
    osPreference: "windows_preferred",
    screenSize: scenario.preferences.portability > 70 ? "13_14" : "14_16",
    portabilityImportance: String(scenario.preferences.portability),
    batteryImportance: String(scenario.preferences.battery),
    toolAi: "true",
    toolVms: String(scenario.sliders.virtual_machines > 40),
    toolCad: String(scenario.major === "engineering"),
    toolAdobe: String(scenario.major === "design"),
    toolGaming: String(scenario.sliders.gaming > 35),
    intent: `${scenario.major} workflow, ${scenario.budgetUsd} USD budget, reduced-regret shortlist.`
  });

  if (scenario.context.acceptsOpenBox) {
    params.set("acceptsOpenBox", "true");
  }
  if (scenario.context.acceptsRefurbished) {
    params.set("acceptsRefurbished", "true");
  }
  if (scenario.context.financingAllowed) {
    params.set("financingAllowed", "true");
  }

  return `/results?${params.toString()}`;
}

function performanceLabel(value) {
  return {
    safe_balanced: "Safe and balanced",
    performance_first: "Performance-first",
    battery_first: "Battery-first",
    portability_first: "Portability-first"
  }[value] ?? "Safe and balanced";
}

function osLabel(value) {
  return {
    windows_preferred: "Windows preferred",
    macos_open: "macOS open",
    any: "Any OS"
  }[value] ?? "Windows preferred";
}

function screenLabel(value) {
  return {
    "13_14": '13"-14"',
    "14_16": '14"-16"',
    "16_plus": '16"+'
  }[value] ?? '14"-16"';
}

function buildSearchSubtitle(state) {
  const tools = [
    state.toolAi && "AI tools",
    state.toolVms && "VMs",
    state.toolCad && "CAD",
    state.toolAdobe && "Adobe",
    state.toolGaming && "Gaming"
  ].filter(Boolean);

  return tools.length ? tools.join(" • ") : "General student workload";
}

function buildResultsQuery(state) {
  return new URLSearchParams({
    major: state.uiState.major,
    budgetUsd: String(state.uiState.budgetUsd),
    stretchBudget: String(state.uiState.stretchBudget),
    performancePreference: state.uiState.performancePreference,
    portabilityScore: String(state.uiState.portabilityScore),
    batteryScore: String(state.uiState.batteryScore),
    osPreference: state.uiState.osPreference,
    screenSize: state.uiState.screenSize,
    portabilityImportance: String(state.uiState.portabilityImportance),
    batteryImportance: String(state.uiState.batteryImportance),
    toolAi: String(state.uiState.toolAi),
    toolVms: String(state.uiState.toolVms),
    toolCad: String(state.uiState.toolCad),
    toolAdobe: String(state.uiState.toolAdobe),
    toolGaming: String(state.uiState.toolGaming),
    intent: state.uiState.intent,
    acceptsOpenBox: String(state.profile.context.acceptsOpenBox),
    acceptsRefurbished: String(state.profile.context.acceptsRefurbished),
    financingAllowed: String(state.profile.context.financingAllowed)
  }).toString();
}

function renderSearchPage(state) {
  return uiShellTemplate({
    title: "MajorLogic Search",
    pageClass: "search-page",
    body: `
      <section class="ml-window">
        <div class="ml-window-bar">
          <div class="ml-window-brand">
            <span class="ml-window-brand-mark">ML</span>
            <span>MajorLogic</span>
          </div>
          <span class="ml-window-close">×</span>
        </div>
        <div class="ml-window-body">
          <div class="ml-search-shell">
            <h1 class="ml-heading">Find Your Future. Start Here</h1>
            <p class="ml-subheading">Your 30-Second Laptop Matchmaker</p>
            <div class="ml-divider"></div>
            <form class="ml-stack" method="GET" action="/results">
              <section>
                <div class="ml-section-title">Quick Picks</div>
                <div class="ml-choice-grid">
                  ${MAJOR_OPTIONS.map((option) => `
                    <label class="ml-choice">
                      <input type="radio" name="major" value="${option.value}"${state.uiState.major === option.value ? " checked" : ""} />
                      <span class="ml-choice-body">
                        <span class="ml-choice-symbol">${option.engineMajor === "cs" ? "</>" : option.engineMajor === "engineering" ? "ENG" : "ART"}</span>
                        <span class="ml-choice-title">${escapeHtml(option.label)}</span>
                      </span>
                    </label>
                  `).join("")}
                </div>
              </section>
              <section class="ml-budget-row">
                <div>
                  <div class="ml-section-title">Budget</div>
                  <div class="ml-slider-card">
                    <div class="ml-slider-top">
                      <span class="ml-slider-title">Budget Slider</span>
                      <span class="ml-slider-value" id="budgetValue">$${escapeHtml(state.uiState.budgetUsd)}</span>
                    </div>
                    <input class="ml-range" type="range" min="500" max="3000" step="50" name="budgetUsd" value="${escapeHtml(state.uiState.budgetUsd)}" oninput="document.getElementById('budgetValue').textContent='$' + this.value" />
                    <div class="ml-range-meta">
                      <span>$500</span>
                      <span>$3000+</span>
                    </div>
                  </div>
                  <div class="ml-toggle-row">
                    <span>Stretch my budget 15% for future-proof deals</span>
                    <label class="ml-toggle">
                      <input type="checkbox" name="stretchBudget" value="true"${state.uiState.stretchBudget ? " checked" : ""} />
                      <span class="ml-toggle-track"></span>
                    </label>
                  </div>
                </div>
                <div>
                  <div class="ml-section-title">Preferences</div>
                  <div class="ml-slider-card">
                    <div class="ml-slider-top">
                      <span class="ml-slider-title">Portability</span>
                      <span class="ml-slider-value" id="portabilityValue">${escapeHtml(state.uiState.portabilityScore)}/10</span>
                    </div>
                    <input class="ml-range" type="range" min="0" max="10" step="1" name="portabilityScore" value="${escapeHtml(state.uiState.portabilityScore)}" oninput="document.getElementById('portabilityValue').textContent=this.value + '/10'" />
                    <div class="ml-range-meta">
                      <span>0</span>
                      <span>10</span>
                    </div>
                  </div>
                  <div class="ml-slider-card">
                    <div class="ml-slider-top">
                      <span class="ml-slider-title">Battery</span>
                      <span class="ml-slider-value" id="batteryValue">${escapeHtml(state.uiState.batteryScore)}/10</span>
                    </div>
                    <input class="ml-range" type="range" min="0" max="10" step="1" name="batteryScore" value="${escapeHtml(state.uiState.batteryScore)}" oninput="document.getElementById('batteryValue').textContent=this.value + '/10'" />
                    <div class="ml-range-meta">
                      <span>0</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>
              </section>
              <section class="ml-intuition">
                <div class="ml-section-title">AI Intuition</div>
                <textarea name="intent" placeholder="Eg., reliable coding laptop, long battery for campus, enough power for AI work.">${escapeHtml(state.uiState.intent)}</textarea>
              </section>
              <div class="ml-hidden">
                <input type="hidden" name="osPreference" value="${escapeHtml(state.uiState.osPreference)}" />
                <input type="hidden" name="screenSize" value="${escapeHtml(state.uiState.screenSize)}" />
                <input type="hidden" name="toolAi" value="${escapeHtml(state.uiState.toolAi)}" />
                <input type="hidden" name="toolVms" value="${escapeHtml(state.uiState.toolVms)}" />
                <input type="hidden" name="toolCad" value="${escapeHtml(state.uiState.toolCad)}" />
                <input type="hidden" name="toolAdobe" value="${escapeHtml(state.uiState.toolAdobe)}" />
                <input type="hidden" name="toolGaming" value="${escapeHtml(state.uiState.toolGaming)}" />
                <input type="hidden" name="acceptsOpenBox" value="${escapeHtml(state.profile.context.acceptsOpenBox)}" />
                <input type="hidden" name="acceptsRefurbished" value="${escapeHtml(state.profile.context.acceptsRefurbished)}" />
                <input type="hidden" name="financingAllowed" value="${escapeHtml(state.profile.context.financingAllowed)}" />
              </div>
              <div class="ml-submit">
                <button type="submit">Analyze with AI</button>
              </div>
              <div class="ml-foot-note">No sponsored ranking. Transparent rule-based output.</div>
            </form>
          </div>
        </div>
      </section>
    `
  });
}

function recommendationLabel(cardType, majorLabel) {
  return {
    hero: `Best for ${majorLabel}`,
    smart_budget: "Budget Smart",
    future_proof: "Future-Proof"
  }[cardType] ?? "Recommended";
}

function metricText(card, index) {
  const scale = ["High", "Medium", "Compact", "Moderate"];
  return {
    performance: index === 0 ? "High" : "Balanced",
    battery: card.cardType === "future_proof" ? "Medium" : "Strong",
    portability: card.cardType === "smart_budget" ? "Moderate" : scale[index] ?? "Balanced",
    display: card.cardType === "future_proof" ? "High" : "Balanced",
    upgradeability: "Good",
    noise: card.cardType === "future_proof" ? "Can run loud" : "Controlled"
  };
}

function renderNoResultsPanel(state, result) {
  const suggestions = result.decision?.noResults?.suggestions?.length
    ? result.decision.noResults.suggestions.map((suggestion) => `<li>${escapeHtml(suggestion)}</li>`).join("")
    : `<li>Try widening the budget or allowing refurbished inventory.</li>`;

  return uiShellTemplate({
    title: "MajorLogic Results",
    pageClass: "results-page",
    body: `
      <section class="ml-window">
        <div class="ml-window-bar">
          <div class="ml-window-brand">
            <span class="ml-window-brand-mark">ML</span>
            <span>MajorLogic</span>
          </div>
          <a href="/search?${buildResultsQuery(state)}" style="color:#fff">Edit</a>
        </div>
        <div class="ml-window-body">
          <div class="ml-results-copy">
            <h1 class="ml-results-title">No safe match right now.</h1>
            <div class="ml-results-sub">${escapeHtml(result.decision?.noResults?.message ?? "The engine could not recommend a safe fit from the current catalog.")}</div>
            <div class="ml-warning"><strong>Next:</strong></div>
            <ul>${suggestions}</ul>
          </div>
        </div>
      </section>
    `
  });
}

function renderResultsPage(state, result) {
  if (result.error) {
    return uiShellTemplate({
      title: "MajorLogic Results",
      pageClass: "results-page",
      body: `
        <article class="result-card">
          <div class="eyebrow">Catalog unavailable</div>
          <h1 style="font-size:clamp(2rem,4vw,3.4rem)">The published catalog is not ready.</h1>
          <p class="lead">${escapeHtml(result.message ?? result.error)}</p>
          <div class="cta-row">
            <a class="button-link" href="/search">Back to search</a>
          </div>
        </article>
      `
    });
  }

  if (result.decision?.status === "no_viable_option") {
    return renderNoResultsPanel(state, result);
  }

  const cards = result.decision.cards;
  const hero = cards.find((card) => card.cardType === "hero") ?? cards[0];
  const alternatives = cards.filter((card) => card.entityId !== hero.entityId);
  const confidence = result.trust?.decisionConfidenceLevel ?? "medium";
  const heroAudit = result.trust?.cardAudits?.find((audit) => audit.cardType === hero.cardType);
  const reasons = [
    hero.whyThis,
    `Aligned to ${state.uiState.majorLabel}`,
    `${performanceLabel(state.uiState.performancePreference)} profile`,
    `${osLabel(state.uiState.osPreference)}`,
    `Resale score ${hero.resaleScore ?? "n/a"}`
  ].filter(Boolean).slice(0, 5);

  const compareCards = [hero, ...alternatives].slice(0, 4);

  return uiShellTemplate({
    title: "MajorLogic Results",
    pageClass: "results-page",
    body: `
      <section class="summary-bar">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div>
            <div class="eyebrow">Search summary</div>
            <h2 style="margin-top:8px">Decision cockpit</h2>
          </div>
          <div class="actions">
            <a class="button-link" href="/search">Edit Search</a>
          </div>
        </div>
        <div class="summary-grid">
          <div class="summary-item"><div class="eyebrow">Major</div><strong>${escapeHtml(state.uiState.majorLabel)}</strong></div>
          <div class="summary-item"><div class="eyebrow">Budget</div><strong>${escapeHtml(state.uiState.budgetUsd)} USD</strong></div>
          <div class="summary-item"><div class="eyebrow">Priority</div><strong>${escapeHtml(performanceLabel(state.uiState.performancePreference))}</strong></div>
          <div class="summary-item"><div class="eyebrow">OS</div><strong>${escapeHtml(osLabel(state.uiState.osPreference))}</strong></div>
          <div class="summary-item"><div class="eyebrow">Confidence</div><strong>${escapeHtml(confidence)}</strong></div>
        </div>
      </section>

      <section class="results-stack">
        <section class="result-hero">
          <article class="result-card">
            <div class="hero-badge">${escapeHtml(recommendationLabel(hero.cardType, state.uiState.majorLabel))}</div>
            <h1 style="font-size:clamp(2.2rem,4vw,3.9rem)">${escapeHtml(hero.title)}</h1>
            <p class="lead">${escapeHtml(hero.whyThis ?? "Best overall fit for the selected profile.")}</p>
            <div class="reason-list">
              ${reasons.map((reason) => `<div class="reason-item">${escapeHtml(reason)}</div>`).join("")}
            </div>
            <div class="accordion">
              <div class="eyebrow">Tradeoffs</div>
              <p class="lead" style="max-width:none; font-size:0.98rem">${escapeHtml(hero.tradeoff ?? "No major tradeoff listed.")}</p>
              <p class="lead" style="max-width:none; font-size:0.98rem; margin-top:10px"><strong>Bad News:</strong> ${escapeHtml(hero.badNews ?? "No warning listed.")}</p>
            </div>
            <div class="cta-row">
              <a class="button-link" href="/results?${new URLSearchParams({ major: state.uiState.major, budgetUsd: String(state.uiState.budgetUsd), stretchBudget: String(state.uiState.stretchBudget), performancePreference: state.uiState.performancePreference, osPreference: state.uiState.osPreference, screenSize: state.uiState.screenSize, portabilityImportance: String(state.uiState.portabilityImportance), batteryImportance: String(state.uiState.batteryImportance), toolAi: String(state.uiState.toolAi), toolVms: String(state.uiState.toolVms), toolCad: String(state.uiState.toolCad), toolAdobe: String(state.uiState.toolAdobe), toolGaming: String(state.uiState.toolGaming), intent: state.uiState.intent }).toString()}">Refresh Result</a>
            </div>
          </article>

          <div class="alt-stack">
            <article class="hero-visual">
              ${hero.imageUrl
                ? `<img class="product-photo" src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.title)}" />`
                : `<div class="hero-laptop"><div class="hero-screen"></div><div class="hero-base"></div></div>`}
            </article>
            ${alternatives.slice(0, 3).map((card) => `
              <article class="alt-card">
                <div class="alt-card-head">
                  <div>
                    <div class="hero-badge">${escapeHtml(recommendationLabel(card.cardType, state.uiState.majorLabel))}</div>
                    <h3 style="margin-top:10px">${escapeHtml(card.title)}</h3>
                    <p class="lead" style="font-size:0.94rem; max-width:none">${escapeHtml(card.whyThis ?? "")}</p>
                  </div>
                  ${card.imageUrl ? `<img class="alt-thumb" src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.title)}" />` : `<div class="alt-thumb"></div>`}
                </div>
                <ul>
                  <li>${escapeHtml(card.badNews ?? "No warning listed.")}</li>
                  <li>${escapeHtml(card.tradeoff ?? "No tradeoff listed.")}</li>
                </ul>
                <div class="cta-row">
                  <a class="button-link" href="#">View Details</a>
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <section class="section-grid">
          <article class="compare-table">
            <div class="eyebrow">Why these results</div>
            <h2 style="margin-top:8px">Matched to fit, budget, and long-term regret control.</h2>
            <div class="metric-grid">
              <div class="metric"><div class="eyebrow">Budget</div><div class="metric-value">${escapeHtml(state.uiState.budgetUsd)}$</div></div>
              <div class="metric"><div class="eyebrow">Screen</div><div class="metric-value" style="font-size:1.1rem">${escapeHtml(screenLabel(state.uiState.screenSize))}</div></div>
              <div class="metric"><div class="eyebrow">OS</div><div class="metric-value" style="font-size:1.1rem">${escapeHtml(osLabel(state.uiState.osPreference))}</div></div>
              <div class="metric"><div class="eyebrow">Tools</div><div class="metric-value" style="font-size:1.1rem">${escapeHtml(buildSearchSubtitle(state.uiState))}</div></div>
            </div>
          </article>
          <article class="warning-block">
            <div class="eyebrow">Tradeoffs and warnings</div>
            <ul>
              <li>${escapeHtml(hero.badNews ?? "No warning listed.")}</li>
              <li>${escapeHtml(hero.tradeoff ?? "No tradeoff listed.")}</li>
              ${alternatives.slice(0, 2).map((card) => `<li>${escapeHtml(card.title)}: ${escapeHtml(card.badNews ?? "No warning listed.")}</li>`).join("")}
            </ul>
          </article>
        </section>

        ${renderOwnershipSection(result)}
        ${renderCommercialRoutesSection(result)}

        <section class="section-grid">
          <article class="compare-table">
            <div class="eyebrow">Compare options</div>
            <div class="table-desktop">
              <table>
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Performance</th>
                    <th>Battery</th>
                    <th>Portability</th>
                    <th>Display</th>
                    <th>Upgradeability</th>
                    <th>Noise / thermals</th>
                    <th>Main compromise</th>
                  </tr>
                </thead>
                <tbody>
                  ${compareCards.map((card, index) => {
                    const metrics = metricText(card, index);
                    return `<tr>
                      <td><strong>${escapeHtml(card.title)}</strong><br /><span class="muted">${escapeHtml(recommendationLabel(card.cardType, state.uiState.majorLabel))}</span></td>
                      <td>${escapeHtml(metrics.performance)}</td>
                      <td>${escapeHtml(metrics.battery)}</td>
                      <td>${escapeHtml(metrics.portability)}</td>
                      <td>${escapeHtml(metrics.display)}</td>
                      <td>${escapeHtml(metrics.upgradeability)}</td>
                      <td>${escapeHtml(metrics.noise)}</td>
                      <td>${escapeHtml(card.tradeoff ?? "No tradeoff listed.")}</td>
                    </tr>`;
                  }).join("")}
                </tbody>
              </table>
            </div>
            <div class="table-mobile">
              ${compareCards.map((card, index) => {
                const metrics = metricText(card, index);
                return `<div class="mobile-compare-card">
                  <div class="hero-badge">${escapeHtml(recommendationLabel(card.cardType, state.uiState.majorLabel))}</div>
                  <h3 style="margin-top:10px">${escapeHtml(card.title)}</h3>
                  <p class="muted" style="margin-top:8px">Performance ${escapeHtml(metrics.performance)} • Battery ${escapeHtml(metrics.battery)} • Portability ${escapeHtml(metrics.portability)}</p>
                  <p class="muted" style="margin-top:8px">${escapeHtml(card.tradeoff ?? "No tradeoff listed.")}</p>
                </div>`;
              }).join("")}
            </div>
          </article>

          <article class="trust-block">
            <div class="eyebrow">Transparency</div>
            <h2 style="margin-top:8px">Trust block</h2>
            <ul>
              <li>Rule-based selection</li>
              <li>No ad-driven ranking</li>
              <li>No sponsored winners</li>
              <li>Recommendations based on fit and constraints</li>
              <li>Clear reasoning over hype</li>
            </ul>
            <div class="accordion">
              <div class="eyebrow">Why this won</div>
              <p class="lead" style="font-size:0.96rem; max-width:none">${escapeHtml(heroAudit?.strengths?.join(", ") || hero.whyThis || "The engine scored this option highest for the selected constraints.")}</p>
            </div>
            <div class="cta-row">
              <a class="button-link" href="/search">Refine search</a>
              <a class="button-link" href="#">Compare top 2</a>
              <a class="button-link" href="#">Save shortlist</a>
            </div>
          </article>
        </section>
      </section>
    `
  });
}

function renderOwnershipSection(result) {
  const ownership = result.ownership;
  if (!ownership || ownership.status !== "ok" || !ownership.strategies?.length) {
    return "";
  }

  const rows = ownership.strategies
    .filter((s) => s.lifecycle)
    .map((s) => `
      <tr>
        <td><strong>${escapeHtml(s.title ?? s.cardType)}</strong></td>
        <td>$${escapeHtml(s.lifecycle.purchasePrice)}</td>
        <td>$${escapeHtml(s.lifecycle.costPerYear)}/yr</td>
        <td>~$${escapeHtml(s.lifecycle.estimatedResaleValue)}</td>
        <td>${escapeHtml(s.recommendation?.mode?.replace(/_/g, " ") ?? "buy new")}</td>
      </tr>`).join("");

  return `
    <section class="section-grid">
      <article class="compare-table">
        <div class="eyebrow">Ownership Strategy</div>
        <h2 style="margin-top:8px">Total Cost of Ownership (${ownership.ownershipYears}-year horizon)</h2>
        <p class="muted" style="margin-top:6px">${escapeHtml(ownership.bestValueSummary ?? "")}</p>
        <div class="table-desktop" style="margin-top:16px">
          <table>
            <thead>
              <tr>
                <th>Option</th>
                <th>Purchase</th>
                <th>Effective cost</th>
                <th>Resale recovery</th>
                <th>Recommended path</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="table-mobile">
          ${ownership.strategies.filter((s) => s.lifecycle).map((s) => `
            <div class="mobile-compare-card">
              <h3>${escapeHtml(s.title ?? s.cardType)}</h3>
              <p class="muted">$${escapeHtml(s.lifecycle.costPerYear)}/yr effective • ~$${escapeHtml(s.lifecycle.estimatedResaleValue)} resale</p>
              <p class="muted">${escapeHtml(s.recommendation?.explanation ?? "")}</p>
            </div>`).join("")}
        </div>
      </article>
    </section>`;
}

function renderCommercialRoutesSection(result) {
  const routes = result.commercialRoutes;
  if (!routes || !Array.isArray(routes) || !routes.length) {
    return "";
  }

  const resolved = routes.filter((r) => r.status === "resolved");
  if (!resolved.length) {
    return "";
  }

  return `
    <section class="section-grid">
      <article class="compare-table">
        <div class="eyebrow">Purchase links</div>
        <h2 style="margin-top:8px">Where to buy</h2>
        <p class="muted" style="margin-top:6px">Links selected independently after the recommendation. Affiliate status does not affect ranking.</p>
        <div style="margin-top:16px; display:flex; gap:12px; flex-wrap:wrap">
          ${resolved.map((r) => `
            <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:16px 20px; flex:1; min-width:220px">
              <div class="eyebrow">${escapeHtml(r.cardType?.replace(/_/g, " ") ?? "Option")}</div>
              <div style="margin-top:6px; font-size:1.05rem"><strong>$${escapeHtml(r.selectedOffer?.priceUsd ?? "?")}</strong> — ${escapeHtml(r.selectedOffer?.seller ?? "Unknown")}</div>
              <div class="muted" style="margin-top:4px">${r.selectedOffer?.affiliate ? "Affiliate link" : "Direct link"} • ${escapeHtml(r.selectedOffer?.condition ?? "new")}</div>
            </div>`).join("")}
        </div>
      </article>
    </section>`;
}

function renderNoResultsPanelSimple(state, result) {
  const suggestions = result.decision?.noResults?.suggestions?.length
    ? result.decision.noResults.suggestions.map((suggestion) => `<li>${escapeHtml(suggestion)}</li>`).join("")
    : `<li>Try widening the budget or allowing refurbished inventory.</li>`;

  return uiShellTemplate({
    title: "MajorLogic Results",
    pageClass: "results-page",
    body: `
      <section class="ml-window">
        <div class="ml-window-bar">
          <div class="ml-window-brand">
            <span class="ml-window-brand-mark">ML</span>
            <span>MajorLogic</span>
          </div>
          <a href="/search?${buildResultsQuery(state)}" style="color:#fff">Edit</a>
        </div>
        <div class="ml-window-body">
          <div class="ml-results-copy">
            <h1 class="ml-results-title">No safe match right now.</h1>
            <div class="ml-results-sub">${escapeHtml(result.decision?.noResults?.message ?? "The engine could not recommend a safe fit from the current catalog.")}</div>
            <div class="ml-warning"><strong>Next:</strong></div>
            <ul>${suggestions}</ul>
          </div>
        </div>
      </section>
    `
  });
}

function renderResultsPageSimple(state, result) {
  if (result.error) {
    return uiShellTemplate({
      title: "MajorLogic Results",
      pageClass: "results-page",
      body: `
        <article class="result-card">
          <div class="eyebrow">Catalog unavailable</div>
          <h1 style="font-size:clamp(2rem,4vw,3.4rem)">The published catalog is not ready.</h1>
          <p class="lead">${escapeHtml(result.message ?? result.error)}</p>
          <div class="cta-row">
            <a class="button-link" href="/search">Back to search</a>
          </div>
        </article>
      `
    });
  }

  if (result.decision?.status === "no_viable_option") {
    return renderNoResultsPanelSimple(state, result);
  }

  const cards = result.decision.cards;
  const hero = cards.find((card) => card.cardType === "hero") ?? cards[0];
  const alternatives = cards.filter((card) => card.entityId !== hero.entityId);
  const reasons = [
    hero.whyThis,
    `Aligned to ${state.uiState.majorLabel}`,
    `${performanceLabel(state.uiState.performancePreference)} profile`,
    `Resale score ${hero.resaleScore ?? "n/a"}`
  ].filter(Boolean).slice(0, 3);

  return uiShellTemplate({
    title: "MajorLogic Results",
    pageClass: "results-page",
    body: `
      <section class="ml-window">
        <div class="ml-window-body">
          <div class="ml-results-shell">
            <div class="ml-results-top">
              <div class="trust-strip">
                <span class="trust-pill">No Ads.</span>
                <span class="trust-pill">No Commission.</span>
                <span class="trust-pill">Rule-Based.</span>
              </div>
            </div>
            <section class="ml-results-stage">
              <div class="ml-results-copy">
                <h1 class="ml-results-title">Trustworthy laptop recommendations.</h1>
                <div class="ml-results-sub">${escapeHtml(state.uiState.majorLabel)} · $${escapeHtml(state.uiState.budgetUsd)} · ${escapeHtml(performanceLabel(state.uiState.performancePreference))}</div>
                <div class="ml-badge">${escapeHtml(recommendationLabel(hero.cardType, state.uiState.majorLabel))}</div>
                <div class="ml-hero-name">${escapeHtml(hero.title)}</div>
                <div class="ml-hero-tag">${escapeHtml(hero.whyThis ?? "Best overall fit for the selected profile.")}</div>
                <div class="ml-why">
                  <h3>Why this?</h3>
                  <div class="ml-checks">
                    ${reasons.map((reason) => `<div class="ml-check">${escapeHtml(reason)}</div>`).join("")}
                  </div>
                </div>
                <div class="ml-warning"><strong>Bad News:</strong> ${escapeHtml(hero.badNews ?? hero.tradeoff ?? "No warning listed.")}</div>
                <a class="ml-action" href="/search?${buildResultsQuery(state)}">Edit Search</a>
              </div>
              <div class="ml-hero-art">
                ${hero.imageUrl
                  ? `<img src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.title)}" />`
                  : `<div class="hero-laptop"><div class="hero-screen"></div><div class="hero-base"></div></div>`}
              </div>
              <div class="ml-side-stack">
                ${alternatives.slice(0, 3).map((card) => `
                  <details class="ml-side-card">
                    <summary style="list-style:none; cursor:pointer;">
                      <div class="ml-side-head">
                        <div>
                          <div class="ml-badge">${escapeHtml(recommendationLabel(card.cardType, state.uiState.majorLabel))}</div>
                          <h4>${escapeHtml(card.title)}</h4>
                          <div class="ml-side-copy">${escapeHtml(card.whyThis ?? "")}</div>
                        </div>
                        ${card.imageUrl ? `<img src="${escapeHtml(card.imageUrl)}" alt="${escapeHtml(card.title)}" />` : `<div></div>`}
                      </div>
                    </summary>
                    <div class="ml-side-warning"><strong>Bad News:</strong> ${escapeHtml(card.badNews ?? "No warning listed.")}</div>
                    <div class="ml-side-warning"><strong>Tradeoff:</strong> ${escapeHtml(card.tradeoff ?? "No tradeoff listed.")}</div>
                    <div class="ml-side-warning"><strong>Resale:</strong> ${escapeHtml(card.resaleScore ?? "n/a")}</div>
                    <span class="ml-side-link">View Details</span>
                  </details>
                `).join("")}
              </div>
            </section>
          </div>
        </div>
      </section>
    `
  });
}

function adminPageTemplate({ title, heading, eyebrow, intro, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4ecde;
        --bg-strong: #e8d9bd;
        --panel: rgba(255, 252, 245, 0.88);
        --panel-strong: #fffdf8;
        --ink: #1f2933;
        --muted: #5f6c7b;
        --accent: #8b5e34;
        --accent-strong: #205c54;
        --border: rgba(107, 92, 69, 0.18);
        --shadow: 0 18px 38px rgba(31, 41, 51, 0.08);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(32, 92, 84, 0.16), transparent 22rem),
          radial-gradient(circle at bottom right, rgba(139, 94, 52, 0.18), transparent 26rem),
          linear-gradient(180deg, #faf6ef 0%, var(--bg) 100%);
      }
      a { color: inherit; text-decoration: none; }
      main {
        max-width: 1320px;
        margin: 0 auto;
        padding: 24px 18px 48px;
      }
      .shell {
        background: rgba(255, 253, 248, 0.52);
        border: 1px solid var(--border);
        border-radius: 30px;
        padding: 22px;
        backdrop-filter: blur(10px);
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .brand {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .eyebrow {
        color: var(--accent-strong);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.74rem;
      }
      h1, h2, h3, h4, p { margin: 0; }
      h1 {
        font-size: clamp(2rem, 4vw, 3.2rem);
        line-height: 1;
      }
      p {
        color: var(--muted);
        line-height: 1.6;
      }
      nav {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .nav-link {
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.55);
        font-size: 0.95rem;
      }
      .hero {
        margin-top: 18px;
        padding: 26px;
        border-radius: 28px;
        background:
          linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,249,240,0.9)),
          linear-gradient(135deg, rgba(32,92,84,0.12), rgba(139,94,52,0.08));
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
      }
      .hero p {
        max-width: 840px;
        margin-top: 10px;
      }
      .section {
        margin-top: 20px;
        display: grid;
        gap: 18px;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 16px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 20px;
        box-shadow: var(--shadow);
      }
      .stat-value {
        margin-top: 10px;
        font-size: 2rem;
        color: var(--accent-strong);
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(32, 92, 84, 0.10);
        color: var(--accent-strong);
        font-size: 0.9rem;
      }
      .grid-2 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 18px;
      }
      .grid-3 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
      }
      .label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
      }
      dl {
        margin: 14px 0 0;
        display: grid;
        grid-template-columns: 160px 1fr;
        gap: 10px 12px;
      }
      dt {
        color: var(--muted);
        font-weight: bold;
      }
      dd {
        margin: 0;
        overflow-wrap: anywhere;
      }
      code {
        font-family: Consolas, monospace;
        font-size: 0.9rem;
        background: rgba(32, 92, 84, 0.08);
        padding: 3px 7px;
        border-radius: 8px;
      }
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.95rem;
      }
      th, td {
        padding: 12px 10px;
        border-bottom: 1px solid rgba(107, 92, 69, 0.12);
        text-align: left;
        vertical-align: top;
      }
      th {
        color: var(--muted);
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .scenario-list {
        display: grid;
        gap: 14px;
      }
      .scenario-item {
        display: grid;
        gap: 10px;
        padding: 16px;
        border-radius: 20px;
        border: 1px solid rgba(107, 92, 69, 0.12);
        background: rgba(255,255,255,0.5);
      }
      .scenario-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .cards-line {
        color: var(--muted);
      }
      .cards-line strong {
        color: var(--ink);
      }
      .entity-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
      }
      .entity-card {
        padding: 16px;
        border-radius: 18px;
        background: rgba(255,255,255,0.5);
        border: 1px solid rgba(107, 92, 69, 0.12);
      }
      .muted {
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main>
      <div class="shell">
        <div class="topbar">
          <div class="brand">
            <div class="eyebrow">${escapeHtml(eyebrow)}</div>
            <h1>${escapeHtml(heading)}</h1>
          </div>
          <nav>
            <a class="nav-link" href="/admin/dashboard">Dashboard</a>
            <a class="nav-link" href="/admin/overview">Overview</a>
            <a class="nav-link" href="/admin/decision-latest">Latest Decision</a>
            <a class="nav-link" href="/admin/dashboard.json">JSON</a>
          </nav>
        </div>
        <section class="hero">
          <p>${escapeHtml(intro)}</p>
        </section>
        ${body}
      </div>
    </main>
  </body>
</html>`;
}

function renderDecisionCards(cards) {
  return cards.map((card) => `
    <article class="card">
      <div class="label">${escapeHtml(card.cardType ?? "card")}</div>
      <h3 style="margin-top:8px">${escapeHtml(card.title ?? "Untitled entity")}</h3>
      <p style="margin-top:8px"><strong>Price:</strong> ${escapeHtml(card.priceUsd ?? "n/a")} USD</p>
      <p><strong>Score:</strong> ${escapeHtml(card.score ?? "n/a")}</p>
      <p><strong>Why selected:</strong> ${escapeHtml(card.whyThis ?? "not available")}</p>
      <p><strong>Bad news:</strong> ${escapeHtml(card.badNews ?? "none")}</p>
      <p><strong>Tradeoff:</strong> ${escapeHtml(card.tradeoff ?? "not available")}</p>
      <p><strong>Resale score:</strong> ${escapeHtml(card.resaleScore ?? "n/a")}</p>
      <p><strong>Entity ID:</strong> <code>${escapeHtml(card.entityId ?? "n/a")}</code></p>
    </article>
  `).join("");
}

function renderOverviewBody(overview) {
  const latestIngestion = overview.latestIngestionRun;
  const latestPublish = overview.latestPublishRun;
  const latestDecision = overview.latestDecisionRun;

  return `
    <section class="section">
      <div class="stats">
        <article class="card"><div class="label">Raw observations</div><div class="stat-value">${escapeHtml(overview.counts.source_observations ?? 0)}</div></article>
        <article class="card"><div class="label">Published entities</div><div class="stat-value">${escapeHtml(overview.counts.published_entities ?? 0)}</div></article>
        <article class="card"><div class="label">Decision runs</div><div class="stat-value">${escapeHtml(overview.counts.decision_runs ?? 0)}</div></article>
      </div>
      <div class="grid-2">
        <section class="card">
          <h2>Latest ingestion</h2>
          <dl>
            <dt>Status</dt><dd>${escapeHtml(latestIngestion?.status ?? "not available")}</dd>
            <dt>Started at</dt><dd>${escapeHtml(latestIngestion?.started_at ?? "not available")}</dd>
            <dt>Finished at</dt><dd>${escapeHtml(latestIngestion?.finished_at ?? "not available")}</dd>
            <dt>Source count</dt><dd>${escapeHtml(latestIngestion?.source_count ?? 0)}</dd>
            <dt>Normalized count</dt><dd>${escapeHtml(latestIngestion?.normalized_count ?? 0)}</dd>
          </dl>
        </section>
        <section class="card">
          <h2>Latest publish</h2>
          <dl>
            <dt>Catalog version</dt><dd><code>${escapeHtml(latestPublish?.catalog_version ?? "not available")}</code></dd>
            <dt>Publish run ID</dt><dd><code>${escapeHtml(latestPublish?.publish_run_id ?? "not available")}</code></dd>
            <dt>Status</dt><dd>${escapeHtml(latestPublish?.status ?? "not available")}</dd>
            <dt>Observation source</dt><dd>${escapeHtml(latestPublish?.observation_source ?? "not available")}</dd>
            <dt>Published entities</dt><dd>${escapeHtml(latestPublish?.published_entity_count ?? 0)}</dd>
            <dt>Completed at</dt><dd>${escapeHtml(latestPublish?.completed_at ?? "not available")}</dd>
          </dl>
        </section>
      </div>
      <section class="card">
        <h2>Latest decision trace</h2>
        <dl>
          <dt>Decision run ID</dt><dd><code>${escapeHtml(latestDecision?.decision_run_id ?? "not available")}</code></dd>
          <dt>Catalog version used</dt><dd><code>${escapeHtml(latestDecision?.catalog_version ?? "not available")}</code></dd>
          <dt>Publish run used</dt><dd><code>${escapeHtml(latestDecision?.publish_run_id ?? "not available")}</code></dd>
          <dt>Logic version</dt><dd>${escapeHtml(latestDecision?.logic_version ?? "not available")}</dd>
          <dt>Created at</dt><dd>${escapeHtml(latestDecision?.created_at ?? "not available")}</dd>
        </dl>
      </section>
    </section>
  `;
}

function renderLatestDecisionBody(details) {
  if (!details) {
    return `<section class="section"><article class="card"><p>No decision run found yet.</p></article></section>`;
  }

  const trustFindings = details.trust?.findings?.length
    ? `<ul style="margin:12px 0 0; color:var(--muted); padding-left:18px;">${details.trust.findings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("")}</ul>`
    : `<p style="margin-top:12px" class="muted">No trust findings were raised for the latest decision.</p>`;

  const exclusionSummary = details.trust?.exclusionSummary?.length
    ? `<div class="table-wrap" style="margin-top:12px">
        <table>
          <thead><tr><th>Reason</th><th>Count</th></tr></thead>
          <tbody>
            ${details.trust.exclusionSummary.map((item) => `<tr><td>${escapeHtml(item.reason)}</td><td>${escapeHtml(item.count)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>`
    : `<p style="margin-top:12px" class="muted">No exclusion summary was needed for this run.</p>`;

  const trustCards = details.trust?.cardAudits?.length
    ? `<div class="grid-3" style="margin-top:16px">
        ${details.trust.cardAudits.map((audit) => `
          <article class="card">
            <div class="label">${escapeHtml(audit.cardType)}</div>
            <h3 style="margin-top:8px">${escapeHtml(audit.title ?? audit.entityId)}</h3>
            <p style="margin-top:8px"><strong>Confidence:</strong> ${escapeHtml(audit.confidenceLevel)} (${escapeHtml(audit.confidenceScore)})</p>
            <p><strong>Review coverage:</strong> ${escapeHtml(audit.reviewCoverage ?? "n/a")}</p>
            <p><strong>Freshness days:</strong> ${escapeHtml(audit.freshnessDays ?? "n/a")}</p>
            <p><strong>Warnings:</strong> ${escapeHtml((audit.warnings ?? []).join(", ") || "none")}</p>
            <p><strong>Strengths:</strong> ${escapeHtml((audit.strengths ?? []).join(", ") || "none")}</p>
          </article>
        `).join("")}
      </div>`
    : "";

  return `
    <section class="section">
      <section class="card">
        <div class="label">Latest decision</div>
        <h2 style="margin-top:8px">Decision explanation view</h2>
        <dl>
          <dt>Decision run ID</dt><dd><code>${escapeHtml(details.decisionRunId)}</code></dd>
          <dt>Catalog version used</dt><dd><code>${escapeHtml(details.catalogVersion ?? "not available")}</code></dd>
          <dt>Publish run used</dt><dd><code>${escapeHtml(details.publishRunId ?? "not available")}</code></dd>
          <dt>Logic version</dt><dd>${escapeHtml(details.logicVersion ?? "not available")}</dd>
          <dt>Created at</dt><dd>${escapeHtml(details.createdAt ?? "not available")}</dd>
          <dt>Profile ID</dt><dd>${escapeHtml(details.profile?.profileId ?? details.profile?.id ?? "not available")}</dd>
          <dt>Trust status</dt><dd><span class="pill">${details.trust?.ok ? "passed" : "review needed"}</span></dd>
          <dt>Decision confidence</dt><dd>${escapeHtml(details.trust?.decisionConfidenceLevel ?? "n/a")} (${escapeHtml(details.trust?.decisionConfidenceScore ?? "n/a")})</dd>
          <dt>Ownership strategy</dt><dd>${escapeHtml(details.ownership?.mode ?? "not available")}${details.ownership?.explanation ? ` - ${escapeHtml(details.ownership.explanation)}` : ""}</dd>
          <dt>Excluded candidates</dt><dd>${escapeHtml(details.trust?.trace?.excludedCount ?? 0)}</dd>
        </dl>
      </section>
      <section class="card">
        <div class="label">Trust report</div>
        <h2 style="margin-top:8px">Integrity findings</h2>
        ${trustFindings}
        <h3 style="margin-top:18px">Excluded candidate reasons</h3>
        ${exclusionSummary}
      </section>
      <div class="grid-3">
        ${renderDecisionCards(details.cards)}
      </div>
      ${trustCards}
    </section>
  `;
}

function renderScenarioList(scenariosPayload) {
  if (!scenariosPayload?.scenarios?.length) {
    return `<article class="card"><p>No generated scenario matrix found yet. Run <code>npm run scenarios:run</code>.</p></article>`;
  }

  const items = scenariosPayload.scenarios.map((scenario) => {
    const cardsLine = scenario.cards.length
      ? scenario.cards.map((card) => `<strong>${escapeHtml(card.cardType)}</strong>: ${escapeHtml(card.title)}`).join(" <span class=\"muted\">|</span> ")
      : `<span class="muted">${escapeHtml(scenario.noResults?.message ?? "No cards returned")}</span>`;

    return `
      <article class="scenario-item">
        <div class="scenario-head">
          <div>
            <div class="label">${escapeHtml(scenario.major)} scenario</div>
            <h3 style="margin-top:6px">${escapeHtml(scenario.profileId)}</h3>
          </div>
          <div class="pill">${escapeHtml(scenario.status)} - ${escapeHtml(scenario.candidateCount)} candidates</div>
        </div>
        <p>Budget: ${escapeHtml(scenario.budgetUsd)} USD</p>
        <div class="cards-line">${cardsLine}</div>
      </article>
    `;
  }).join("");

  return `
    <section class="card">
      <div class="label">Scenario matrix</div>
      <h2 style="margin-top:8px">Where the recommendations actually change</h2>
      <p style="margin-top:10px">These are generated from the current published catalog and show how the engine behaves under different majors, budgets, workloads, and ownership constraints.</p>
      <div class="scenario-list" style="margin-top:16px">
        ${items}
      </div>
    </section>
  `;
}

function renderPublishedEntities(entities) {
  if (!entities?.length) {
    return `<article class="card"><p>No published entities found.</p></article>`;
  }

  const cards = entities.map((entity) => `
    <article class="entity-card">
      <div class="label">${escapeHtml(entity.catalog_version ?? "catalog")}</div>
      <h3 style="margin-top:8px">${escapeHtml(entity.title)}</h3>
      <p style="margin-top:8px"><strong>Price:</strong> ${escapeHtml(entity.price_usd ?? "n/a")} USD</p>
      <p><strong>Resale:</strong> ${escapeHtml(entity.resale_score ?? "n/a")}</p>
      <p><strong>Engineering:</strong> ${escapeHtml(entity.engineering_fit ?? "n/a")}</p>
      <p><strong>CS:</strong> ${escapeHtml(entity.cs_fit ?? "n/a")}</p>
      <p><strong>Design:</strong> ${escapeHtml(entity.design_fit ?? "n/a")}</p>
      <p><strong>General:</strong> ${escapeHtml(entity.general_fit ?? "n/a")}</p>
      <p><strong>Medical:</strong> ${escapeHtml(entity.medical_fit ?? "n/a")}</p>
    </article>
  `).join("");

  return `
    <section class="card">
      <div class="label">Published catalog</div>
      <h2 style="margin-top:8px">Live published entities</h2>
      <p style="margin-top:10px">This is the decision-facing catalog currently powering the engine, not the raw source layer.</p>
      <div class="entity-grid" style="margin-top:16px">
        ${cards}
      </div>
    </section>
  `;
}

function renderDashboardHtml(data) {
  const overview = data.overview;
  const latestDecision = data.latestDecision;
  const scenariosPayload = data.scenarios;
  const entities = data.publishedEntities;

  const heroTitle = latestDecision?.cards?.find((card) => card.cardType === "hero")?.title ?? "No hero saved yet";
  const scenarioDiversity = scenariosPayload?.scenarios
    ? new Set(
        scenariosPayload.scenarios
          .flatMap((scenario) => scenario.cards.map((card) => `${card.cardType}:${card.entityId}`))
      ).size
    : 0;

  const body = `
    <section class="section">
      <div class="stats">
        <article class="card"><div class="label">Raw observations</div><div class="stat-value">${escapeHtml(overview.counts.source_observations ?? 0)}</div></article>
        <article class="card"><div class="label">Published entities</div><div class="stat-value">${escapeHtml(overview.counts.published_entities ?? 0)}</div></article>
        <article class="card"><div class="label">Decision runs</div><div class="stat-value">${escapeHtml(overview.counts.decision_runs ?? 0)}</div></article>
        <article class="card"><div class="label">Scenario variety</div><div class="stat-value">${escapeHtml(scenarioDiversity)}</div></article>
      </div>
      <div class="grid-2">
        <section class="card">
          <div class="label">Current engine state</div>
          <h2 style="margin-top:8px">Latest published-to-decision chain</h2>
          <dl>
            <dt>Catalog version</dt><dd><code>${escapeHtml(overview.latestPublishRun?.catalog_version ?? "not available")}</code></dd>
            <dt>Publish run</dt><dd><code>${escapeHtml(overview.latestPublishRun?.publish_run_id ?? "not available")}</code></dd>
            <dt>Latest decision run</dt><dd><code>${escapeHtml(overview.latestDecisionRun?.decision_run_id ?? "not available")}</code></dd>
            <dt>Hero card now</dt><dd>${escapeHtml(heroTitle)}</dd>
            <dt>Observation source</dt><dd>${escapeHtml(overview.latestPublishRun?.observation_source ?? "not available")}</dd>
          </dl>
        </section>
        <section class="card">
          <div class="label">What changed</div>
          <h2 style="margin-top:8px">Scenario matrix summary</h2>
          <p style="margin-top:10px">The catalog is no longer too small to show meaningful variation. The scenarios now produce visibly different heroes and trade-offs across majors, budgets, and workload sliders.</p>
          <dl>
            <dt>Scenario count</dt><dd>${escapeHtml(scenariosPayload?.scenarioCount ?? 0)}</dd>
            <dt>Generated at</dt><dd>${escapeHtml(scenariosPayload?.generatedAt ?? "not available")}</dd>
            <dt>Catalog version used</dt><dd><code>${escapeHtml(scenariosPayload?.catalogVersion ?? "not available")}</code></dd>
          </dl>
        </section>
      </div>
      ${renderScenarioList(scenariosPayload)}
      ${renderPublishedEntities(entities)}
      ${renderLatestDecisionBody(latestDecision)}
    </section>
  `;

  return adminPageTemplate({
    title: "MajorLogic Admin Dashboard",
    heading: "MajorLogic Decision Dashboard",
    eyebrow: "Administrative Surface",
    intro: "This dashboard unifies the health of the platform, the published decision-facing catalog, the latest saved recommendation, and the scenario matrix that proves when and why results actually change.",
    body
  });
}

function renderOverviewHtml(overview) {
  return adminPageTemplate({
    title: "MajorLogic Admin Overview",
    heading: "Platform Overview",
    eyebrow: "Administrative Surface",
    intro: `This page gives a plain-language snapshot of the latest platform runs for ${overview.domainId}.`,
    body: renderOverviewBody(overview)
  });
}

function renderLatestDecisionHtml(details) {
  return adminPageTemplate({
    title: "MajorLogic Latest Decision",
    heading: "Latest Decision",
    eyebrow: "Administrative Surface",
    intro: "This page explains the latest saved recommendation run and ties it to the exact published catalog version used.",
    body: renderLatestDecisionBody(details)
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

function sendHtml(res, html) {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

async function handleAdminJson(req, res, builder) {
  try {
    const payload = await builder();
    if (!payload) {
      sendJson(res, 503, {
        error: "database_unavailable",
        message: "Set DATABASE_URL before using the admin pages."
      });
      return;
    }

    if (payload === HTML_SENTINEL) {
      return;
    }

    sendJson(res, 200, payload);
  } catch (error) {
    sendJson(res, 500, { error: "admin_request_failed", message: error.message });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url.startsWith("/public/")) {
    const filePath = path.join(__dirname, "..", req.url);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mime = ext === ".css" ? "text/css" : ext === ".js" ? "application/javascript" : "application/octet-stream";
      res.writeHead(200, { "content-type": mime });
      res.end(fs.readFileSync(filePath));
      return;
    }
    res.writeHead(404);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(302, { location: "/search" });
    res.end();
    return;
  }

  if (req.method === "GET" && (req.url === "/search" || req.url.startsWith("/search?"))) {
    handleAdminJson(req, res, async () => {
      const url = new URL(req.url, `http://${req.headers.host ?? `localhost:${port}`}`);
      const state = buildSearchState(url.searchParams);
      const html = newRenderSearchPage(state);
      sendHtml(res, html);
      return HTML_SENTINEL;
    }).catch(() => {});
    return;
  }

  if (req.method === "GET" && (req.url === "/results" || req.url.startsWith("/results?"))) {
    handleAdminJson(req, res, async () => {
      const url = new URL(req.url, `http://${req.headers.host ?? `localhost:${port}`}`);
      const state = buildSearchState(url.searchParams);
      const result = await runPipeline(state.profile);
      const html = newRenderResultsPage({ state, result });
      sendHtml(res, html);
      return HTML_SENTINEL;
    }).catch(() => {});
    return;
  }

  if (req.method === "GET" && (req.url === "/admin" || req.url === "/admin/dashboard")) {
    handleAdminJson(req, res, async () => {
      const dashboardData = await buildAdminDashboardData();
      if (!dashboardData) {
        return null;
      }

      sendHtml(res, renderDashboardHtml(dashboardData));
      return HTML_SENTINEL;
    }).catch(() => {});
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, service: "majorlogic-api" });
    return;
  }

  if (req.method === "GET" && req.url === "/admin/dashboard.json") {
    handleAdminJson(req, res, buildAdminDashboardData);
    return;
  }

  if (req.method === "GET" && (req.url === "/admin/overview" || req.url === "/admin/overview.json")) {
    if (req.url === "/admin/overview.json") {
      handleAdminJson(req, res, async () => {
        const repository = await getRepository();
        if (!repository) {
          return null;
        }
        return repository.getAdminOverview({ domainId: laptopStudentUsDomainPack.meta.domainId });
      });
      return;
    }

    handleAdminJson(req, res, async () => {
      const repository = await getRepository();
      if (!repository) {
        return null;
      }

      const overview = await repository.getAdminOverview({ domainId: laptopStudentUsDomainPack.meta.domainId });
      sendHtml(res, renderOverviewHtml(overview));
      return HTML_SENTINEL;
    }).catch(() => {});
    return;
  }

  if (req.method === "GET" && (req.url === "/admin/decision-latest" || req.url === "/admin/decision-latest.json")) {
    if (req.url === "/admin/decision-latest.json") {
      handleAdminJson(req, res, async () => {
        const repository = await getRepository();
        if (!repository) {
          return null;
        }
        return repository.getLatestDecisionDetails({ domainId: laptopStudentUsDomainPack.meta.domainId });
      });
      return;
    }

    handleAdminJson(req, res, async () => {
      const repository = await getRepository();
      if (!repository) {
        return null;
      }

      const details = await repository.getLatestDecisionDetails({ domainId: laptopStudentUsDomainPack.meta.domainId });
      sendHtml(res, renderLatestDecisionHtml(details));
      return HTML_SENTINEL;
    }).catch(() => {});
    return;
  }

  if (req.method === "GET" && req.url === "/admin/scenarios.json") {
    sendJson(res, 200, readGeneratedScenarioResults() ?? {
      error: "scenario_file_missing",
      message: "Run `npm run scenarios:run` first."
    });
    return;
  }

  if (req.method === "POST" && req.url === "/decision/run") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        const profile = JSON.parse(body);
        const result = await runPipeline(profile);
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 500, { error: "decision_run_failed", message: error.message });
      }
    });
    return;
  }

  sendJson(res, 404, { error: "not_found" });
});

server.listen(port, () => {
  console.log(`MajorLogic platform API running on http://localhost:${port}`);
});
