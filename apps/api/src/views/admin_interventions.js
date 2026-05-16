import { escapeHtml } from "./templates.js";

export function renderInterventionsHtml(interventions) {
  const rows = interventions.map(i => `
    <tr style="border-bottom: 1px solid #2d2d4e;">
      <td style="padding: 16px; font-family: monospace; font-size: 12px; color: #888;">${i.decision_run_id.substring(0, 8)}...</td>
      <td style="padding: 16px;"><span style="background: rgba(124, 58, 237, 0.1); color: #c4b5fd; padding: 4px 10px; border-radius: 6px; font-size: 12px;">${i.relaxed_constraint}</span></td>
      <td style="padding: 16px; text-align: center;">
        <div style="font-weight: 800; color: ${i.integrity_score >= 80 ? '#10b981' : '#f59e0b'}">${i.integrity_score}%</div>
      </td>
      <td style="padding: 16px; text-align: center; color: #888;">${i.original_excluded_count} → <span style="color: #fff;">${i.recovered_count}</span></td>
      <td style="padding: 16px; font-size: 12px; color: #555;">${new Date(i.created_at).toLocaleString()}</td>
      <td style="padding: 16px; text-align: right;">
        <a href="http://localhost:5174/results?runId=${i.decision_run_id}" target="_blank" style="color: #7C3AED; text-decoration: none; font-size: 12px;">Inspect ↗</a>
      </td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Intervention Manager — MajorLogic</title>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background: #0a0a1a; color: #e0e0e0; padding: 48px; }
    .card { background: #12122a; border-radius: 16px; padding: 32px; border: 1px solid #2d2d4e; }
    h1 { font-size: 24px; color: #fff; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 32px; }
    th { text-align: left; padding: 12px 16px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #2d2d4e; }
    nav a { color: #7C3AED; text-decoration: none; font-size: 14px; margin-right: 16px; }
  </style>
</head>
<body>
  <nav style="margin-bottom: 32px;">
    <a href="/admin">← Dashboard</a>
    <a href="/admin/interventions">🛡️ Interventions</a>
  </nav>

  <div class="card">
    <h1>🛡️ Intervention Manager</h1>
    <p style="color: #888;">History of automated constraint relaxation by the Recovery Engine.</p>

    <table>
      <thead>
        <tr>
          <th>Run ID</th>
          <th>Relaxed Constraint</th>
          <th style="text-align: center;">Integrity</th>
          <th style="text-align: center;">Recovery (Old → New)</th>
          <th>Timestamp</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="6" style="padding: 48px; text-align: center; color: #555;">No interventions logged yet.</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}
