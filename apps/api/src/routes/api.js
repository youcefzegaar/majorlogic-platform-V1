import { createHmac, timingSafeEqual } from "node:crypto";
import { sendWelcomeEmail } from "../../../../packages/email-service/src/index.js";
import { getValidDomains } from "../registry.js";

export default async function apiRoutes(fastify, { isProd }) {

  fastify.get("/api/v1/health", async (_request, reply) => {
    return reply.send({ ok: true, service: "majorlogic-api" });
  });

  fastify.post("/api/v1/:domain/decision/run", {
    schema: {
      body: {
        type: "object",
        properties: {
          id: { type: "string" },
          major: { type: "string" },
          locale: { type: "string" },
          budgetUsd: { type: "number", minimum: 100, maximum: 20000 },
          preferences: { type: "object", additionalProperties: true },
          sliders: { type: "object", additionalProperties: true },
          context: { type: "object", additionalProperties: true },
          productIntent: { type: "object", additionalProperties: true }
        },
        required: ["major", "budgetUsd"]
      }
    }
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    try {
      const { getDomainController } = await import("../registry.js");
      const controller = getDomainController(domain);
      const result = await controller.runPipeline(request.body);
      return reply.send(result);
    } catch (err) {
      request.log.error({ err, domain }, "Decision run failed");
      return reply.status(500).send({
        error: "decision_run_failed",
        message: isProd ? "Internal Server Error" : err.message
      });
    }
  });

  fastify.post("/api/v1/:domain/telemetry/click", async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    const { decisionRunId, entityId, clickType = "buy_now_clicked" } = request.body;

    if (!decisionRunId || !entityId) {
      return reply.status(400).send({ error: "missing_telemetry_fields", message: "decisionRunId and entityId required" });
    }

    try {
      const { getRepository } = await import("../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline_for_telemetry" });
      await repository.saveTelemetryClick({ decisionRunId, entityId, clickType });
      return reply.send({ ok: true, logged: true, entityId });
    } catch (err) {
      return reply.status(500).send({ error: "telemetry_logging_failed", message: err.message });
    }
  });

  fastify.post("/api/v1/:domain/growth/lead", async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    const { email, leadType, optedIn = false, trackingData = {}, decisionRunId: leadDecisionRunId = null } = request.body;
    const VALID_LEAD_TYPES = ["save_results", "price_alert", "interstitial_gate"];

    if (!email || !leadType) {
      return reply.status(400).send({ error: "missing_lead_fields", message: "email and leadType are required" });
    }
    if (!VALID_LEAD_TYPES.includes(leadType)) {
      return reply.status(400).send({ error: "invalid_lead_type", message: `leadType must be one of: ${VALID_LEAD_TYPES.join(", ")}` });
    }
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return reply.status(400).send({ error: "invalid_email_format" });
    }

    try {
      const { getRepository } = await import("../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline" });

      // For price_alert leads: look up current entity price and store as watched baseline
      let enrichedMetadata = { ...trackingData };
      if (leadType === "price_alert" && trackingData.entityId && !enrichedMetadata.watchedPriceUsd) {
        try {
          const entities = await repository.getPublishedEntities({ domainId: domain });
          const entity = entities.find(e => e.entityId === trackingData.entityId);
          const currentPrice = entity?.market?.bestOffer?.priceUsd;
          if (currentPrice != null) enrichedMetadata.watchedPriceUsd = currentPrice;
        } catch { /* non-fatal */ }
      }

      const lead = await repository.saveGrowthLead({ domainId: domain, email, leadType, metadata: enrichedMetadata, optedIn, decisionRunId: leadDecisionRunId });
      sendWelcomeEmail({ email, leadType, metadata: enrichedMetadata })
        .catch(err => request.log.error({ err }, "[Email] Failed to send welcome email"));

      const msg = lead.isDuplicate ? "Updated your preferences. Thanks!" : "Lead captured. Thank you!";
      return reply.send({ ok: true, leadId: lead.id, leadType, isDuplicate: lead.isDuplicate, message: msg });
    } catch (err) {
      return reply.status(500).send({ error: "lead_capture_failed", message: err.message });
    }
  });

  fastify.post("/api/v1/:domain/feedback", {
    schema: {
      body: {
        type: "object",
        properties: {
          decisionRunId: { type: "string", minLength: 1 },
          score: { type: "integer", minimum: 1, maximum: 5 },
          comment: { type: "string", maxLength: 1000 },
          tags: { type: "array", items: { type: "string" }, maxItems: 20 }
        },
        required: ["decisionRunId", "score"]
      }
    }
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    const { decisionRunId, score, comment, tags } = request.body;
    try {
      const { getRepository, getUsersRepository } = await import("../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline" });

      // Attach to user account when logged in (session cookie — best-effort, never blocks feedback)
      let userId = null;
      try {
        const rawToken = request.cookies?.user_session;
        if (rawToken) {
          const crypto = await import("node:crypto");
          const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
          const usersRepo = await getUsersRepository();
          if (usersRepo) {
            const user = await usersRepo.getUserBySessionToken(tokenHash);
            userId = user?.id ?? null;
          }
        }
      } catch { /* session lookup is best-effort */ }

      await repository.saveFeedback({ decisionRunId, score, comment, tags, userId });
      return reply.send({ status: "received" });
    } catch (err) {
      request.log.error({ err, decisionRunId }, "Feedback save failed");
      return reply.status(500).send({ error: "feedback_failed" });
    }
  });

  fastify.post("/api/v1/:domain/decision/simulate", {
    schema: {
      body: {
        type: "object",
        properties: {
          major: { type: "string" },
          locale: { type: "string" },
          budgetUsd: { type: "number", minimum: 100, maximum: 20000 },
          preferences: { type: "object", additionalProperties: true },
          sliders: { type: "object", additionalProperties: true },
          context: { type: "object", additionalProperties: true },
          productIntent: { type: "object", additionalProperties: true }
        },
        required: ["major", "budgetUsd"]
      }
    }
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    try {
      const { getDomainController } = await import("../registry.js");
      const controller = getDomainController(domain);
      const result = await controller.runPipeline(request.body);
      return reply.send({
        schemaVersion: result.schemaVersion ?? 2,
        cards: result.decision?.cards?.map(c => ({
          entityId: c.entityId,
          cardType: c.cardType,
          title: c.title,
          score: c.score,
          priceUsd: c.priceUsd,
          explanation: c.explanation ?? null,
        })) ?? [],
        status: result.decision?.status ?? 'ok',
      });
    } catch (err) {
      request.log.error({ err, domain }, "Simulate failed");
      return reply.status(500).send({
        error: "simulate_failed",
        message: isProd ? "Internal Server Error" : err.message
      });
    }
  });

  // CSV Export (HMAC token only — no static secret)
  fastify.get("/api/v1/:domain/growth/leads/export", {
    config: {
      rateLimit: { max: 10, timeWindow: "1 hour" }
    }
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    const { leadType = null, token } = request.query;

    const exportSecret = process.env.ADMIN_EXPORT_SECRET;
    if (!exportSecret) return reply.status(503).send({ error: "export_not_configured" });

    let isAuthorized = false;
    if (token) {
      const dotIdx = token.indexOf(".");
      const expires = dotIdx > 0 ? token.slice(0, dotIdx) : null;
      const sig = dotIdx > 0 ? token.slice(dotIdx + 1) : null;
      const expiresInt = parseInt(expires, 10);
      if (expires && sig && !isNaN(expiresInt) && Date.now() < expiresInt) {
        const expected = createHmac("sha256", exportSecret)
          .update(expires).digest("hex");
        try {
          if (timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) isAuthorized = true;
        } catch { /* length mismatch — not authorized */ }
      }
    }

    if (!isAuthorized) return reply.status(401).send({ error: "unauthorized" });

    try {
      const { getRepository } = await import("../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline" });

      const leads = await repository.getGrowthLeads({ domainId: domain, leadType });
      const header = "id,email,lead_type,opted_in,decision_run_id,entity_id,created_at";

      const csvField = (v) => {
        const s = String(v ?? "");
        if (/^[=+@\t-]/.test(s)) return `'${s}`;
        if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const rows = leads.map(l => {
        const meta = l.metadata || {};
        return [l.id, l.email, l.lead_type, l.opted_in, meta.decisionRunId ?? "", meta.entityId ?? "", l.created_at]
          .map(csvField).join(",");
      });

      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", `attachment; filename=leads-${domain}-${Date.now()}.csv`)
        .send([header, ...rows].join("\n"));
    } catch (err) {
      return reply.status(500).send({ error: "export_failed", message: err.message });
    }
  });

  // ── Automation Jobs Trigger ───────────────────────────────────────────────────
  fastify.get("/api/v1/jobs/run", {
    config: { rateLimit: { max: 20, timeWindow: "1 hour" } }
  }, async (request, reply) => {
    const { job, secret } = request.query;
    const JOB_SECRET = process.env.JOB_SECRET;

    if (!JOB_SECRET) return reply.status(503).send({ error: "jobs_not_configured" });
    if (!secret) return reply.status(401).send({ error: "missing_secret" });

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
      const { getRepository } = await import("../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline" });

      let result;
      if (job === "price_monitor") {
        const { runPriceMonitor } = await import("../jobs/price-monitor.js");
        result = await runPriceMonitor(repository);
      } else if (job === "email_nurture") {
        const { runEmailNurture } = await import("../jobs/email-nurture.js");
        result = await runEmailNurture(repository);
      }

      request.log.info({ job, result }, "Job completed");
      return reply.send({ ok: true, job, result });
    } catch (err) {
      request.log.error({ err, job }, "Job failed");
      return reply.status(500).send({ error: "job_failed", message: err.message });
    }
  });

  fastify.get("/api/v1/:domain/admin/dashboard", async (request, reply) => {
    const { domain } = request.params;
    try {
      const { getDomainController } = await import("../registry.js");
      const controller = getDomainController(domain);
      const data = await controller.buildAdminDashboardData();
      if (!data) return reply.status(503).send({ error: "database_unavailable" });
      return reply.send(data);
    } catch (err) {
      return reply.status(500).send({ error: "admin_request_failed", message: err.message });
    }
  });
}
