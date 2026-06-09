import { scheduleDailyReport } from "./daily-report.js";
import { schedulePriceMonitor } from "./price-monitor.js";
import { runEmailNurture } from "./email-nurture.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startBackgroundJobs(fastify, repo) {
  scheduleDailyReport(repo);
  schedulePriceMonitor(repo);

  // Email nurture: run once 2 minutes after startup, then daily
  setTimeout(() => {
    runEmailNurture(repo).catch(err => fastify.log.error({ err }, "[EmailNurture] Job error"));
    setInterval(() => {
      runEmailNurture(repo).catch(err => fastify.log.error({ err }, "[EmailNurture] Job error"));
    }, MS_PER_DAY);
  }, 2 * 60_000);
}
