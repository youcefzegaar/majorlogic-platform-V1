import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

// ── Catalog Rebuild Job Store ─────────────────────────────────────────────────
// In-memory only — survives request but not restarts. Sufficient for admin use.
const _catalogJobs = new Map(); // jobId → { status, logs, domainId, startedAt, finishedAt }
const JOB_TTL_MS = 30 * 60 * 1000; // purge jobs older than 30 min

function _purgeStaleCatalogJobs() {
  const now = Date.now();
  for (const [id, job] of _catalogJobs) {
    if (job.finishedAt && now - job.finishedAt > JOB_TTL_MS) _catalogJobs.delete(id);
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { sendError, badRequest, notFound, conflict } from "../../utils/errors.js";

export default async function catalogRoutes(fastify) {

  // ── Catalog Rebuild ───────────────────────────────────────────────────────

  fastify.post("/catalog/rebuild", async (request, reply) => {
    const { domainId } = request.body ?? {};
    if (!domainId) return sendError(reply, badRequest("domainId is required", "missing_domain_id"));
    const { getValidDomains } = await import("../../registry.js");
    if (!getValidDomains().has(domainId)) {
      return sendError(reply, badRequest(`Unknown domain: ${domainId}`, "unknown_domain"));
    }

    // Reject if a rebuild for this domain is already running
    for (const job of _catalogJobs.values()) {
      if (job.domainId === domainId && job.status === "running") {
        return reply.status(409).send({ ...conflict("Rebuild already in progress", "rebuild_running").body, jobId: job.id });
      }
    }

    _purgeStaleCatalogJobs();

    const jobId = randomUUID();
    const job = { id: jobId, domainId, status: "running", logs: [], startedAt: Date.now(), finishedAt: null };
    _catalogJobs.set(jobId, job);

    // Resolve repo root (5 levels up from routes/admin/)
    const repoRoot = path.resolve(__dirname, "../../../../..");
    const scriptPath = path.join(repoRoot, "scripts", "catalog-build.js");

    const proc = spawn("node", [scriptPath, `--domain=${domainId}`], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });

    const addLog = (line) => {
      job.logs.push(line.trimEnd());
      if (job.logs.length > 200) job.logs.shift(); // cap memory
    };

    proc.stdout.on("data", (d) => d.toString().split("\n").forEach(addLog));
    proc.stderr.on("data", (d) => d.toString().split("\n").forEach(addLog));

    // Kill the process after 10 minutes to prevent runaway rebuilds
    const REBUILD_TIMEOUT_MS = 10 * 60 * 1000;
    const killTimer = setTimeout(() => {
      if (job.status === "running") {
        proc.kill("SIGTERM");
        job.status = "error";
        job.finishedAt = Date.now();
        job.logs.push("[timeout] Catalog rebuild exceeded 10 minutes — process killed.");
        fastify.log.warn({ domainId, jobId }, "[Admin] Catalog rebuild timed out");
      }
    }, REBUILD_TIMEOUT_MS);

    proc.on("error", (err) => {
      clearTimeout(killTimer);
      if (job.status === "running") {
        job.status = "error";
        job.finishedAt = Date.now();
        job.logs.push(`[error] Process spawn failed: ${err.message}`);
        fastify.log.error({ domainId, jobId, err }, "[Admin] Catalog rebuild spawn error");
      }
    });

    proc.on("close", (code) => {
      clearTimeout(killTimer);
      if (job.status === "running") {
        job.status = code === 0 ? "done" : "error";
        job.finishedAt = Date.now();
      }
    });

    return reply.status(202).send({ jobId, status: "running" });
  });

  fastify.get("/catalog/rebuild/:jobId", async (request, reply) => {
    const job = _catalogJobs.get(request.params.jobId);
    if (!job) return sendError(reply, notFound("Job not found", "job_not_found"));
    return reply.send({
      jobId: job.id,
      domainId: job.domainId,
      status: job.status,
      logs: job.logs,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt
    });
  });
}
