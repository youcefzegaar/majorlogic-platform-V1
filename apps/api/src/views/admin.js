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

export function renderGrowthLeadsHtml(stats = []) {
  const typeLabels = {
    save_results: { label: "Save Results", icon: "📚", color: "#7C3AED" },
    price_alert:  { label: "Price Alert",  icon: "🔔", color: "#2563EB" },
    interstitial_gate: { label: "Interstitial Gate", icon: "🚪", color: "#16a34a" }
  };

  const rows = stats.map(s => {
    const meta = typeLabels[s.lead_type] ?? { label: s.lead_type, icon: "📌", color: "#888" };
    return `
      <tr style="border-bottom:1px solid #2a2a4a;">
        <td style="padding:16px;">${meta.icon} <strong style="color:${meta.color}">${meta.label}</strong></td>
        <td style="padding:16px;text-align:center;font-size:24px;font-weight:700;">${s.total}</td>
        <td style="padding:16px;text-align:center;">${s.opted_in_count} <span style="color:#888;font-size:12px;">(${Math.round(s.opted_in_count/s.total*100)}% opted-in)</span></td>
        <td style="padding:16px;color:#888;font-size:12px;">${new Date(s.latest_at).toLocaleString()}</td>
      </tr>`;
  }).join("");

  const total = stats.reduce((sum, s) => sum + Number(s.total), 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Growth Dashboard — MajorLogic</title>
  <link rel="stylesheet" href="/public/styles.css"/>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d0d1a; color: #e0e0e0; padding: 32px; }
    h1 { color: #7C3AED; }
    table { width: 100%; border-collapse: collapse; background: #1a1a2e; border-radius: 12px; overflow: hidden; }
    th { background: #12122a; padding: 14px 16px; text-align: left; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .stat-chip { display: inline-block; background: #7C3AED22; color: #7C3AED; padding: 4px 12px; border-radius: 99px; font-weight: 700; font-size: 14px; }
    nav a { color: #7C3AED; margin-right: 16px; text-decoration: none; font-size: 14px; }
  </style>
</head>
<body>
  <nav style="margin-bottom:32px;">
    <a href="/admin/dashboard">← Dashboard</a>
    <a href="/admin/overview">Overview</a>
    <a href="/admin/growth">📊 Growth</a>
  </nav>
  <h1>📊 Growth & Lead Intelligence</h1>
  <p style="color:#888;margin-bottom:24px;">Real-time view of all email leads captured via the 3 ethical nets.</p>

  <div style="margin-bottom:24px;">
    <span style="color:#888;font-size:14px;">Total Leads Captured:</span>
    <span class="stat-chip" style="margin-left:8px;">✉️ ${total}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Lead Type</th>
        <th style="text-align:center;">Total</th>
        <th style="text-align:center;">Opted-In for Marketing</th>
        <th>Latest Lead</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="4" style="padding:24px;text-align:center;color:#888;">No leads captured yet.</td></tr>`}
    </tbody>
  </table>

  <p style="margin-top:24px;font-size:12px;color:#888;">
    Export all leads as CSV:
    <a href="/api/v1/laptop-student-us/growth/leads/export?secret=majorlogic-admin" style="color:#7C3AED;">Download CSV →</a>
  </p>
</body>
</html>`;
}