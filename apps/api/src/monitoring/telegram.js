/**
 * Telegram Alert Integration
 *
 * Sends structured notifications to a Telegram bot when critical events occur.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars. Fails silently
 * when not configured — monitoring must never crash the application.
 */

const TELEGRAM_API = "https://api.telegram.org";

// Debounce: suppress repeated identical alerts within 60 seconds
const _recentAlerts = new Map(); // messageKey → timestamp
const DEBOUNCE_MS = 60_000;

function _dedupeKey(message) {
  return message.slice(0, 100);
}

/**
 * Send a Markdown-formatted message to the configured Telegram chat.
 * Fire-and-forget — never awaited by callers that don't need confirmation.
 */
export async function sendTelegramAlert(message) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const key = _dedupeKey(message);
  const lastSent = _recentAlerts.get(key) ?? 0;
  if (Date.now() - lastSent < DEBOUNCE_MS) return;
  _recentAlerts.set(key, Date.now());

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method:  "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
    });
    if (!res.ok) {
      console.warn(`[Telegram] Failed to send alert: HTTP ${res.status}`);
    }
  } catch {
    // Silently ignore — monitoring must never break the app
  }
}

/**
 * Format and send a 500-error alert with request context.
 */
export function alertServerError(error, method, url) {
  const ts      = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const stack   = (error.stack ?? "").split("\n").slice(0, 3).join("\n");
  const message = `🔴 *خطأ في MajorLogic API*

📍 \`${method} ${url}\`
❌ ${escapeMarkdown(error.message)}

\`\`\`
${stack}
\`\`\`

⏰ ${ts}`;
  sendTelegramAlert(message);
}

/**
 * Format and send a DB-offline alert.
 */
export function alertDbOffline(reason) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  sendTelegramAlert(`🗄️ *قاعدة البيانات انقطعت*

❌ ${escapeMarkdown(reason ?? "Unknown error")}

⏰ ${ts}
⚡ الحل: تحقق من Supabase → افتح Railway وأعد تشغيل الـ API`);
}

/**
 * Format and send a server-startup notification.
 */
export function alertStartup(port) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  sendTelegramAlert(`✅ *MajorLogic API — تم التشغيل*

🚀 منفذ: \`${port}\`
⏰ ${ts}`);
}

/**
 * Send the daily integrity + operations + regret report.
 * No debounce — this is a scheduled once-daily send.
 */
export async function sendDailyReport(report) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const ts = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const provisional = (label) => `${label} ⚠️ _[provisional — عيّنة صغيرة]_`;

  const integrityLine = report.moneyBlindness.score != null
    ? `• فصل المال: ${report.moneyBlindness.score}%${report.moneyBlindness.provisional ? ' ⚠️' : ' ✅'}`
    : '• فصل المال: لا بيانات بعد';

  const sacrificeLine = report.decisions.overallPassedRate != null
    ? `• الضحية مرئية: ${report.decisions.overallPassedRate}%${report.decisions.overallPassedRate === 100 ? ' ✅' : ' ⚠️'}`
    : '• الضحية مرئية: لا بيانات بعد';

  const feedbackLine = report.feedback.avgScore7d != null
    ? `• متوسط الرضا: ${report.feedback.avgScore7d.toFixed(1)}/5 (${report.feedback.count7d} تقييم)${report.feedback.provisional ? '\n  ' + provisional('') : ''}`
    : '• لا تقييمات بعد';

  const catalogLine = report.catalog?.isStale
    ? `🗄️ *الكتالوج* — ⚠️ *بيانات قديمة (${report.catalog.oldestAgeHours != null ? Math.round(report.catalog.oldestAgeHours) + 'h' : '?'} > SLA ${report.catalog.slaHours}h)*`
    : report.catalog?.entityCount != null
      ? `🗄️ *الكتالوج* — ${report.catalog.entityCount} منتج ✅ (${report.catalog.oldestAgeHours != null ? Math.round(report.catalog.oldestAgeHours) + 'h' : '?'} منذ آخر نشر)`
      : '';

  const pr = report.priceRefresh;
  const pricesLine = pr
    ? `💰 *الأسعار* — ${pr.refreshed} محدّث، ${pr.stale} قديم، ${pr.failed} فشل`
    : '';

  const message = `📊 *MajorLogic — Daily Integrity Report*
⏰ ${ts}

🛡️ *النزاهة*
• القرارات (7 أيام): ${report.decisions.total}
${integrityLine}
${sacrificeLine}

${catalogLine}
${pricesLine ? pricesLine + '\n' : ''}
⚙️ *العمليات*
• Uptime: ${Math.floor(report.operations.uptime / 3600)}h | RAM: ${report.operations.memoryMb}MB

💬 *الرضا*
${feedbackLine}`;

  try {
    await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
    });
  } catch { /* Silently ignore — reporting must never crash the app */ }
}

/**
 * Escape Telegram Markdown special characters.
 */
function escapeMarkdown(text) {
  return String(text ?? "").replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}
