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

export function renderAffiliateSettingsHtml(settings = [], saved = false) {
  const SELLER_ICONS = {
    "Amazon":   "🛒",
    "Best Buy": "💙",
    "B&H":      "📷",
    "Newegg":   "⚡",
    "Framework":"🔧",
    "Apple":    "🍎",
    "Dell":     "💻",
    "Lenovo":   "🖥️"
  };

  const rows = settings.map(s => {
    const icon = SELLER_ICONS[s.seller] ?? "🏪";
    const isActive = s.is_active;
    const hasTag = s.affiliate_tag && s.affiliate_tag.length > 0;
    const statusBadge = hasTag
      ? `<span style="background:#14532d;color:#4ade80;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;">✅ Active</span>`
      : `<span style="background:#3b1010;color:#f87171;padding:2px 10px;border-radius:99px;font-size:11px;">⚠️ No Tag</span>`;

    return `
    <div style="background:#12122a;border:1px solid ${hasTag ? '#1e3a1e' : '#3b1010'};border-radius:12px;padding:24px;margin-bottom:16px;">
      <form method="POST" action="/admin/affiliate" style="display:grid;grid-template-columns:1fr 1fr auto;gap:16px;align-items:end;">
        <input type="hidden" name="secret" value="majorlogic-admin">
        <input type="hidden" name="seller" value="${s.seller}">

        <div>
          <div style="font-size:20px;margin-bottom:8px;">${icon} <strong style="color:#e2d9f3;">${s.seller_display_name ?? s.seller}</strong> ${statusBadge}</div>
          <p style="color:#6b7280;font-size:12px;margin:0;">${s.notes ?? ""}</p>
        </div>

        <div>
          <label style="display:block;color:#9ca3af;font-size:12px;margin-bottom:6px;">
            Affiliate Tag / Code
            <span style="color:#555;"> (param: <code style="color:#7C3AED;">${s.affiliate_param_key ?? 'tag'}</code>)</span>
          </label>
          <input
            type="text"
            name="affiliateTag"
            value="${s.affiliate_tag ?? ''}"
            placeholder="e.g. majorlogic-20"
            style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid ${hasTag ? '#7C3AED' : '#4b5563'};background:#0d0d1a;color:#fff;font-size:14px;font-family:monospace;box-sizing:border-box;"
          >
        </div>

        <div style="display:flex;gap:8px;align-items:center;">
          <label style="display:flex;align-items:center;gap:6px;color:#9ca3af;font-size:12px;cursor:pointer;">
            <input type="checkbox" name="isActive" value="true" ${isActive ? 'checked' : ''}
              style="width:16px;height:16px;accent-color:#7C3AED;">
            Active
          </label>
          <button type="submit"
            style="background:#7C3AED;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer;font-size:14px;white-space:nowrap;">
            💾 Save
          </button>
        </div>
      </form>
    </div>`;
  }).join("");

  const savedBanner = saved
    ? `<div style="background:#14532d;border:1px solid #16a34a;border-radius:8px;padding:12px 20px;margin-bottom:24px;color:#4ade80;">✅ Affiliate settings saved successfully!</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Affiliate Settings — MajorLogic Admin</title>
  <link rel="stylesheet" href="/public/styles.css"/>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d0d1a; color: #e0e0e0; padding: 32px; max-width: 900px; margin: 0 auto; }
    h1  { color: #7C3AED; margin-bottom: 4px; }
    nav a { color: #7C3AED; margin-right: 16px; text-decoration: none; font-size: 14px; }
    code { background: #1a1a2e; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <nav style="margin-bottom:32px;">
    <a href="/admin/dashboard">← Dashboard</a>
    <a href="/admin/growth">📊 Growth</a>
    <a href="/admin/affiliate">🔗 Affiliate</a>
  </nav>

  <h1>🔗 Affiliate Code Manager</h1>
  <p style="color:#888;margin-bottom:8px;">
    Update your affiliate codes here without touching any code.
    Changes take effect <strong style="color:#c4b5fd;">instantly</strong> on the next user click through the <code>/go/</code> gateway.
  </p>
  <p style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:8px;padding:12px 16px;font-size:13px;color:#9ca3af;margin-bottom:24px;">
    💡 <strong style="color:#c4b5fd;">How it works:</strong> When a student clicks "Buy Now", our server loads the tag saved here and injects it into the redirect URL — no redeploy needed.
  </p>

  ${savedBanner}
  ${rows || '<p style="color:#888;">No affiliate settings found. Run DB migrations first.</p>'}

  <div style="margin-top:32px;padding:20px;background:#0a0a1a;border-radius:12px;border:1px solid #1e1e3a;">
    <h3 style="color:#7C3AED;margin-top:0;">➕ Add a New Store</h3>
    <form method="POST" action="/admin/affiliate" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end;">
      <input type="hidden" name="secret" value="majorlogic-admin">
      <div>
        <label style="display:block;color:#9ca3af;font-size:12px;margin-bottom:6px;">Seller Name (exact)</label>
        <input type="text" name="seller" placeholder="e.g. Costco" required
          style="width:100%;padding:10px;border-radius:8px;border:1px solid #4b5563;background:#0d0d1a;color:#fff;font-size:14px;box-sizing:border-box;">
      </div>
      <div>
        <label style="display:block;color:#9ca3af;font-size:12px;margin-bottom:6px;">Affiliate Tag</label>
        <input type="text" name="affiliateTag" placeholder="e.g. majorlogic-21"
          style="width:100%;padding:10px;border-radius:8px;border:1px solid #4b5563;background:#0d0d1a;color:#fff;font-size:14px;font-family:monospace;box-sizing:border-box;">
      </div>
      <div>
        <label style="display:block;color:#9ca3af;font-size:12px;margin-bottom:6px;">Notes (optional)</label>
        <input type="text" name="notes" placeholder="e.g. Via Impact.com"
          style="width:100%;padding:10px;border-radius:8px;border:1px solid #4b5563;background:#0d0d1a;color:#fff;font-size:14px;box-sizing:border-box;">
      </div>
      <button type="submit"
        style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer;font-size:14px;">
        ➕ Add
      </button>
    </form>
  </div>

  <p style="margin-top:24px;font-size:12px;color:#555;">
    🔒 This page is protected by your <code>ADMIN_EXPORT_SECRET</code>.
    The gateway (<code>/go/:domain/:entityId</code>) reads these settings on every click.
  </p>
</body>
</html>`;
}