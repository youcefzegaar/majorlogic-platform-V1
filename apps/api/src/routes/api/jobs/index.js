import { timingSafeEqual } from "node:crypto";

export default async function jobRoutes(fastify) {
  fastify.get("/jobs/run", {
    config: { rateLimit: { max: 20, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    const { job } = request.query;
    const authHeader = request.headers.authorization || "";
    const secret = authHeader.replace(/^Bearer\s+/i, "").trim();
    const JOB_SECRET = process.env.JOB_SECRET;

    if (!JOB_SECRET) return reply.status(503).send({ error: "jobs_not_configured" });
    if (!secret) return reply.status(401).send({ error: "missing_secret", message: "Provide secret in Authorization: Bearer <token> header" });

    // Constant-time comparison to prevent timing attacks
    try {
      const a = Buffer.from(secret);
      const b = Buffer.from(JOB_SECRET);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return reply.status(401).send({ error: "unauthorized" });
      }
    } catch {
      return reply.status(401).send({ error: "unauthorized" });
    }

    const VALID_JOBS = ["price_monitor", "email_nurture"];
    if (!VALID_JOBS.includes(job)) {
      return reply.status(400).send({ error: "unknown_job", validJobs: VALID_JOBS });
    }

    try {
      const { getRepository } = await import("../../../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline" });

      let result;
      if (job === "price_monitor") {
        const { runPriceMonitor } = await import("../../../jobs/price-monitor.js");
        result = await runPriceMonitor(repository);
      } else if (job === "email_nurture") {
        const { runEmailNurture } = await import("../../../jobs/email-nurture.js");
        result = await runEmailNurture(repository);
      }

      request.log.info({ job, result }, "Job completed");
      return reply.send({ ok: true, job, result });
    } catch (err) {
      request.log.error({ err, job }, "Job failed");
      return reply.status(500).send({ error: "job_failed", message: err.message });
    }
  });
}
