/**
 * Daily Integrity Report — M-report R.3
 *
 * Fetches aggregate data from the DB and sends a 3-section Telegram message:
 *   1. Integrity (money-separation, sacrifice guard, certificate stats)
 *   2. Operations (uptime, memory)
 *   3. Satisfaction (feedback averages)
 *
 * Scheduled daily at 08:00 server time. Can also be triggered manually.
 * Aggregate-only — zero PII in the report.
 * Figures marked [provisional] when sample size < 30.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { sendDailyReport } from "../monitoring/telegram.js";

function loadPriceRefreshLog() {
  try {
    const logPath = join(process.cwd(), "domains/laptop-student-us/generated/price-refresh-log.json");
    return JSON.parse(readFileSync(logPath, "utf8"));
  } catch {
    return null;
  }
}

async function buildReport(repository) {
  const domainId = process.env.DEFAULT_DOMAIN ?? "laptop-student-us";
  const [overview, certStats, feedbackResult, freshness, regretRows] = await Promise.all([
    repository.getAdminOverview({ domainId }),
    repository.getCertificateStats({ sinceDays: 7 }).catch(() => null),
    repository.getUserFeedbackStats({ sinceDays: 7 }).catch(() => null),
    repository.getCatalogFreshness({ domainId }).catch(() => null),
    repository.getRegretStats({ domainId, sinceDays: 30 }).catch(() => []),
  ]);

  const fb = feedbackResult ?? {};

  return {
    decisions: {
      total: overview.counts?.decision_runs ?? 0,
      avgIntegrityScore: certStats?.avg_integrity_score ?? null,
      overallPassedRate: certStats && certStats.certificate_count > 0
        ? Math.round((certStats.passed_count / certStats.certificate_count) * 100)
        : null,
    },
    moneyBlindness: {
      score: certStats?.money_blindness_score ?? null,
      avgSpearmanPct: certStats?.avg_spearman_pct ?? null,
      certificatesAnalyzed: certStats?.certificate_count ?? 0,
      provisional: (certStats?.certificate_count ?? 0) < 30,
    },
    feedback: {
      count7d: fb.count_7d ?? 0,
      avgScore7d: fb.avg_score_7d ?? null,
      provisional: (fb.count_7d ?? 0) < 10,
    },
    catalog: {
      entityCount: freshness?.entityCount ?? null,
      oldestAgeHours: freshness?.oldestAgeHours ?? null,
      isStale: freshness?.isStale ?? null,
      slaHours: freshness?.slaHours ?? 24,
    },
    operations: {
      uptime: process.uptime(),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      node: process.version,
    },
    regret: {
      rows: regretRows ?? [],
      provisional: (regretRows ?? []).reduce((s, r) => s + r.count, 0) < 10,
    },
    priceRefresh: loadPriceRefreshLog(),
  };
}

export async function runDailyReport(repository) {
  try {
    const report = await buildReport(repository);
    await sendDailyReport(report);
    console.log("[DailyReport] Sent successfully");
  } catch (err) {
    console.error("[DailyReport] Failed:", err.message);
  }
}

/**
 * Schedule the daily report job.
 * Fires at 08:00 server time (UTC). Call this once at server startup.
 */
export function scheduleDailyReport(repository) {
  const MS_PER_MINUTE = 60_000;
  const MS_PER_HOUR   = 60 * MS_PER_MINUTE;
  const MS_PER_DAY    = 24 * MS_PER_HOUR;

  function msUntilNext8am() {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(8, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next - now;
  }

  // First fire at next 08:00 UTC, then every 24 hours
  setTimeout(() => {
    runDailyReport(repository);
    setInterval(() => runDailyReport(repository), MS_PER_DAY);
  }, msUntilNext8am());

  console.log(`[DailyReport] Scheduled — next run in ${Math.round(msUntilNext8am() / MS_PER_HOUR)}h`);
}
