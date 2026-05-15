/**
 * Logic Lab — No-Code Decision OS Editor
 * 
 * يسمح لخبراء النطاق (Domain Experts) بتعديل منطق القرار دون لمس الكود.
 */

import { escapeHtml } from "./templates.js";

export function renderLogicLabHtml({ config, domainId }) {
  const gates = Object.entries(config.gates || {});
  const rulesets = Object.entries(config.rulesets || {});

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Logic Lab — No-Code Control Plane</title>
  <link rel="stylesheet" href="/public/styles.css"/>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d0d1a; color: #e0e0e0; padding: 32px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #7C3AED; display: flex; align-items: center; gap: 12px; }
    .lab-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 32px; margin-top: 32px; }
    .section-card { background: #1a1a2e; border-radius: 16px; padding: 24px; border: 1px solid #2d2d4e; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .gate-item { background: #12122a; padding: 16px; border-radius: 12px; margin-bottom: 12px; border-left: 4px solid #7C3AED; }
    .weight-slider { width: 100%; accent-color: #7C3AED; }
    .btn-save { background: #7C3AED; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
    .btn-save:hover { background: #6d28d9; transform: scale(1.02); }
    nav a { color: #7C3AED; text-decoration: none; font-size: 14px; margin-right: 16px; }
    .badge { background: #7C3AED33; color: #7C3AED; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    input, select { background: #0d0d1a; border: 1px solid #333; color: white; padding: 8px; border-radius: 6px; }
  </style>
</head>
<body>
  <nav>
    <a href="/admin/dashboard">← Dashboard</a>
    <a href="/admin/logic">🧪 Logic Lab</a>
    <a href="/admin/growth">📊 Growth</a>
    <a href="/admin/affiliate">🔗 Affiliate</a>
  </nav>

  <h1>🧪 Logic Lab <span class="badge">NO-CODE V1</span></h1>
  <p style="color:#888;">Live editing environment for <strong>${domainId}</strong> decision kernel.</p>

  <form method="POST" action="/admin/logic/save">
    <div class="lab-grid">
      
      <!-- GATES EDITOR -->
      <div class="section-card">
        <h2 style="color:#fff;margin-bottom:20px;">🛡️ Quality Gates (Exclusions)</h2>
        <div id="gates-list">
          ${gates.map(([id, gate]) => `
            <div class="gate-item">
              <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                <strong style="color:#c4b5fd;">${id}</strong>
                <span style="font-size:12px;color:#555;">GATE</span>
              </div>
              <div style="display:grid;gap:8px;">
                <input type="text" name="gate_${id}_meaning" value="${escapeHtml(gate.humanMeaning)}" placeholder="Human Meaning">
                <div style="display:flex;gap:8px;align-items:center;">
                  <span style="font-size:12px;color:#888;">Weight:</span>
                  <input type="number" name="gate_${id}_weight" step="0.1" value="${gate.weight || 0.5}" style="width:60px;">
                </div>
              </div>
            </div>
          `).join("")}
        </div>
        <button type="button" style="background:transparent;border:1px dashed #444;color:#888;width:100%;padding:10px;border-radius:8px;cursor:pointer;">+ Add New Gate</button>
      </div>

      <!-- RULESETS EDITOR -->
      <div class="section-card">
        <h2 style="color:#fff;margin-bottom:20px;">⚖️ Scoring Rulesets (Weighted Math)</h2>
        ${rulesets.map(([id, ruleset]) => `
          <div style="background:#12122a;padding:20px;border-radius:12px;margin-bottom:20px;">
            <h3 style="margin-top:0;font-size:1rem;color:#7C3AED;">Ruleset: ${id}</h3>
            <div style="display:grid;gap:16px;">
              ${Object.entries(ruleset.weights || {}).map(([metric, weight]) => `
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                    <span>${metric}</span>
                    <span id="val_${id}_${metric}" style="font-weight:bold;">${Math.round(weight * 100)}%</span>
                  </div>
                  <input type="range" name="weight_${id}_${metric}" class="weight-slider" min="0" max="1" step="0.05" value="${weight}" 
                    oninput="document.getElementById('val_${id}_${metric}').innerText = Math.round(this.value * 100) + '%'">
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
        
        <div style="margin-top:32px;border-top:1px solid #333;padding-top:20px;display:flex;justify-content:space-between;align-items:center;">
          <p style="font-size:12px;color:#555;">All changes are version-controlled in IR. Current Version: ${config.version}</p>
          <button type="submit" class="btn-save">🚀 Deploy Logic Updates</button>
        </div>
      </div>

    </div>
  </form>

  <div class="section-card" style="margin-top:32px;background:linear-gradient(90deg,#1a1a2e,#0d0d1a);">
    <h2 style="color:#fff;margin-bottom:12px;">📡 Unified API Status</h2>
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px;">
      <div style="background:#0d0d1a;padding:12px;border-radius:8px;text-align:center;border:1px solid #16a34a33;">
        <div style="font-size:10px;color:#888;text-transform:uppercase;">Kernel API</div>
        <div style="color:#4ade80;font-weight:bold;">● ONLINE</div>
      </div>
      <div style="background:#0d0d1a;padding:12px;border-radius:8px;text-align:center;border:1px solid #16a34a33;">
        <div style="font-size:10px;color:#888;text-transform:uppercase;">Explainer API</div>
        <div style="color:#4ade80;font-weight:bold;">● ONLINE</div>
      </div>
      <div style="background:#0d0d1a;padding:12px;border-radius:8px;text-align:center;border:1px solid #16a34a33;">
        <div style="font-size:10px;color:#888;text-transform:uppercase;">Feedback Loop</div>
        <div style="color:#4ade80;font-weight:bold;">● ACTIVE</div>
      </div>
      <div style="background:#0d0d1a;padding:12px;border-radius:8px;text-align:center;border:1px solid #2563eb33;">
        <div style="font-size:10px;color:#888;text-transform:uppercase;">Growth API</div>
        <div style="color:#60a5fa;font-weight:bold;">● READY</div>
      </div>
    </div>
  </div>

</body>
</html>`;
}
