/**
 * MajorLogic API Server — HTTP Router
 *
 * هذا الملف مسؤول عن شيء واحد فقط: استقبال الطلبات وتوجيهها.
 * لا يحتوي على أي منطق خاص بمجال اللابتوبات أو قوالب HTML.
 *
 * المسؤوليات:
 *   - تقديم الملفات الثابتة (public/)
 *   - توجيه الطلبات للـ Controllers
 *   - إدارة الـ Error Boundaries على مستوى الـ HTTP
 */

import http from "node:http";
import fs   from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile }   from "../../../scripts/env.js";

// Controllers
import {
  buildSearchState,
  runPipeline,
  buildAdminDashboardData,
  DOMAIN_ID
} from "./controllers/laptop-student-us.js";

// DB
import { getRepository, loadJsonSync } from "./db/repository.js";

// Views
import { renderSearchPage, renderResultsPage } from "./views/templates.js";
import { renderAuditDashboard }                from "./views/admin_templates.js";

// ─────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, "../../..");
const port      = Number(process.env.PORT ?? 3010);
const HTML_SENTINEL = "__html_sent__";

loadEnvFile(path.join(root, ".env"));

// Load default profile once at startup (sync is fine here — runs before first request)
const defaultProfile   = loadJsonSync("examples/profile.json");
const scenarioProfiles = loadJsonSync("examples/scenario-profiles.json");

// ─────────────────────────────────────────────
// Response Helpers
// ─────────────────────────────────────────────

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

function sendHtml(res, html) {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

// ─────────────────────────────────────────────
// Route Handler Wrapper (DB-gated routes)
// ─────────────────────────────────────────────

async function handle(res, fn) {
  try {
    const payload = await fn();
    if (payload === HTML_SENTINEL) return;
    if (payload === null) {
      sendJson(res, 503, {
        error: "database_unavailable",
        message: "Set DATABASE_URL before using this endpoint."
      });
      return;
    }
    sendJson(res, 200, payload);
  } catch (err) {
    console.error("[handle] Unhandled error:", err.message);
    sendJson(res, 500, { error: "internal_error", message: err.message });
  }
}

// ─────────────────────────────────────────────
// Static File Helper
// ─────────────────────────────────────────────

function serveStatic(res, filePath) {
  const ext  = path.extname(filePath);
  const mime = { ".css": "text/css", ".js": "application/javascript" }[ext] ?? "application/octet-stream";
  res.writeHead(200, { "content-type": mime });
  res.end(fs.readFileSync(filePath));
}

// ─────────────────────────────────────────────
// Scenario Results Helper
// ─────────────────────────────────────────────

function readGeneratedScenarioResults() {
  const file = path.join(root, "domains/laptop-student-us/generated/scenario-results.generated.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// ─────────────────────────────────────────────
// Request Router
// ─────────────────────────────────────────────


export { renderDashboardHtml, renderOverviewHtml, renderLatestDecisionHtml };