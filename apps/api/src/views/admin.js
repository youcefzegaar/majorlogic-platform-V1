/**
 * Admin Views — MajorLogic
 * 
 * Provides HTML templates for the admin dashboard.
 */

import { escapeHtml } from "./templates.js";
import { renderAuditDashboard } from "./admin_templates.js";

/**
 * Main Admin Dashboard Wrapper
 */
export function renderDashboardHtml(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Admin Dashboard — MajorLogic</title>
  <link rel="stylesheet" href="/public/styles.css"/>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d0d1a; color: #e0e0e0; padding: 32px; }
    .card { background: #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #2d2d4e; }
    h1 { color: #7C3AED; }
    h2 { margin-top: 0; font-size: 1.2rem; color: #c4b5fd; }
    nav a { color: #7C3AED; margin-right: 16px; text-decoration: none; font-size: 14px; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .stat-item { background: #12122a; padding: 16px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #fff; }
    .stat-label { font-size: 12px; color: #888; text-transform: uppercase; }
  </style>
</head>
<body>
  <nav style="margin-bottom:32px;">
    <a href="/admin/dashboard">Dashboard</a>
    <a href="/admin/overview">Overview</a>
    <a href="/admin/growth">📊 Growth</a>
    <a href="/admin/affiliate">🔗 Affiliate</a>
    <a href="/admin/account">⚙️ Account</a>
    <a href="/web/search" target="_blank">View Site ↗</a>
  </nav>

  <h1>🛡️ MajorLogic Admin</h1>

  <div class="card">
    <h2>System Health & Counts</h2>
    <div class="stat-grid">
      <div class="stat-item">
        <div class="stat-value">${data?.overview?.counts?.source_observations ?? 0}</div>
        <div class="stat-label">Source Observations</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${data?.overview?.counts?.published_entities ?? 0}</div>
        <div class="stat-label">Published Entities</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${data?.overview?.counts?.decision_runs ?? 0}</div>
        <div class="stat-label">Decision Runs</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Latest Ingestion</h2>
    ${data?.overview?.latestIngestionRun ? `
      <p>ID: <code>${data.overview.latestIngestionRun.id}</code></p>
      <p>Status: <span style="color:${data.overview.latestIngestionRun.status === 'completed' ? '#4ade80' : '#f87171'}">${data.overview.latestIngestionRun.status}</span></p>
      <p>Sources: ${data.overview.latestIngestionRun.source_count} | Normalized: ${data.overview.latestIngestionRun.normalized_count}</p>
    ` : '<p style="color:#888;">No ingestion runs yet.</p>'}
  </div>

  <div class="card">
    <h2>Latest Decision</h2>
    ${data.latestDecision ? `
      <p>Run ID: <code>${data.latestDecision.decisionRunId}</code></p>
      <p>Major: ${data.latestDecision.profile?.major ?? 'unknown'}</p>
      <p><a href="/admin/decision-latest" style="color:#7C3AED;">View Decision Trace →</a></p>
    ` : '<p style="color:#888;">No decisions logged yet.</p>'}
  </div>

</body>
</html>`;
}

export function renderOverviewHtml(overview) {
  // Simple redirect to main dashboard or a list of runs
  return renderDashboardHtml({ counts: overview.counts, latestIngestionRun: overview.latestIngestionRun, latestDecision: overview.latestDecisionRun });
}

export function renderLatestDecisionHtml(latestDecision) {
  return renderAuditDashboard({ details: latestDecision, lang: "ar" });
}

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
        <td style="padding:16px;text-align:center;">${s.opted_in_count} <span style="color:#888;font-size:12px;">(${Math.round(s.opted_in_count/(s.total||1)*100)}% opted-in)</span></td>
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
    <a href="/admin/growth">📊 Growth</a>
    <a href="/admin/affiliate">🔗 Affiliate</a>
    <a href="/admin/account">⚙️ Account</a>
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
    <a href="/api/v1/laptop-student-us/growth/leads/export?secret=${encodeURIComponent(process.env.ADMIN_EXPORT_SECRET ?? "")}" style="color:#7C3AED;">Download CSV →</a>
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
        <input type="hidden" name="secret" value="${escapeHtml(process.env.ADMIN_EXPORT_SECRET ?? "")}">
        <input type="hidden" name="seller" value="${escapeHtml(s.seller)}">

        <div>
          <div style="font-size:20px;margin-bottom:8px;">${icon} <strong style="color:#e2d9f3;">${escapeHtml(s.seller_display_name ?? s.seller)}</strong> ${statusBadge}</div>
          <p style="color:#6b7280;font-size:12px;margin:0;">${escapeHtml(s.notes ?? "")}</p>
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
    <a href="/admin/account">⚙️ Account</a>
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
      <input type="hidden" name="secret" value="${escapeHtml(process.env.ADMIN_EXPORT_SECRET ?? "")}">

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

export function renderAccountSettingsHtml({ username, message, error }) {
  const messageBanner = message
    ? `<div style="background:#14532d;border:1px solid #16a34a;border-radius:8px;padding:12px 20px;margin-bottom:24px;color:#4ade80;">✅ ${escapeHtml(message)}</div>`
    : "";
  const errorBanner = error
    ? `<div style="background:#3b1010;border:1px solid #f87171;border-radius:8px;padding:12px 20px;margin-bottom:24px;color:#fca5a5;">❌ ${escapeHtml(error)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Account Settings — MajorLogic</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d0d1a; color: #e0e0e0; padding: 32px; max-width: 600px; margin: 0 auto; }
    .card { background: #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #2d2d4e; }
    h1 { color: #7C3AED; margin-bottom: 8px; }
    nav a { color: #7C3AED; margin-right: 16px; text-decoration: none; font-size: 14px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #a0a0b0; }
    .form-group input { width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #333; background: #0d0d1a; color: #fff; box-sizing: border-box; }
    .btn { background: #7C3AED; color: #fff; padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; }
    .btn:hover { background: #6D28D9; }
  </style>
</head>
<body>
  <nav style="margin-bottom:32px;">
    <a href="/admin/dashboard">← Dashboard</a>
    <a href="/admin/logout" style="float:right;color:#f87171;">🚪 Logout</a>
  </nav>

  <h1>⚙️ Account Settings</h1>
  <p style="color:#888;">Manage your administrator account.</p>

  ${messageBanner}
  ${errorBanner}

  <div class="card">
    <h2 style="margin-top:0;">Change Password for <strong style="color:#fff;">${escapeHtml(username)}</strong></h2>
    <form action="/admin/account/password" method="POST">
      <div class="form-group">
        <label>Current Password</label>
        <input type="password" name="currentPassword" required>
      </div>
      <div class="form-group">
        <label>New Password</label>
        <input type="password" name="newPassword" minlength="8" required>
      </div>
      <div class="form-group">
        <label>Confirm New Password</label>
        <input type="password" name="confirmPassword" minlength="8" required>
      </div>
      <button type="submit" class="btn">Update Password</button>
    </form>
  </div>
</body>
</html>`;
}