import { sendError, unavailable, badRequest, notFound } from "../../utils/errors.js";

export default async function dashboardRoutes(fastify, { DEFAULT_DOMAIN }) {

  // ── JSON APIs (consumed by React SPA) ────────────────────────────────────

  fastify.get("/dashboard", async (_request, reply) => {
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));

    const data = await repository.getAdminOverview({ domainId: DEFAULT_DOMAIN });
    const interventions = await repository.getRecentInterventions({ domainId: DEFAULT_DOMAIN, limit: 5 });

    return reply.send({
      success: true,
      data: { ...data, latestInterventions: interventions },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node: process.version
      }
    });
  });

  fastify.get("/domains", async (_request, reply) => {
    const { readFile } = await import("node:fs/promises");
    const { resolve, join } = await import("node:path");
    const { getValidDomains } = await import("../../registry.js");
    const domainsDir = resolve(process.cwd(), "domains");
    const domainFolders = [...getValidDomains()];

    const domains = await Promise.all(domainFolders.map(async (slug) => {
      try {
        const configRaw = await readFile(join(domainsDir, slug, "decision-config.json"), "utf-8");
        const config = JSON.parse(configRaw);
        return {
          id: slug, slug,
          title: slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          version: config.version || "1.0.0",
          is_active: true,
          updated_at: new Date().toISOString(),
          config
        };
      } catch (err) {
        fastify.log.warn({ slug, err: err.message }, "[Admin] Failed to load domain config");
        return null;
      }
    }));

    return reply.send({ success: true, domains: domains.filter(Boolean) });
  });

  fastify.get("/decision-trace/:id", async (request, reply) => {
    const { id } = request.params;
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const trace = await repository.getDecisionTrace(id);
    if (!trace) return sendError(reply, notFound("Trace not found", "trace_not_found"));
    return reply.send({ success: true, trace });
  });

  fastify.post("/simulate", {
    schema: {
      body: {
        type: "object",
        properties: {
          domainId:      { type: "string", maxLength: 100 },
          sampleSize:    { type: "integer", minimum: 1, maximum: 500 },
          modifications: { type: "object", additionalProperties: true }
        },
        required: ["domainId"]
      }
    }
  }, async (request, reply) => {
    const { domainId, modifications = {}, sampleSize = 100 } = request.body;
    const { getValidDomains } = await import("../../registry.js");
    if (!getValidDomains().has(domainId)) {
      return sendError(reply, badRequest(`Unknown domain: ${domainId}`, "unknown_domain"));
    }
    const { simulateImpact } = await import("../../../../../packages/admin-decision-api/src/index.js");
    const report = await simulateImpact(domainId, modifications, sampleSize);
    return reply.send({ success: true, report });
  });

  fastify.get("/interventions-data", async (_request, reply) => {
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const interventions = await repository.getRecentInterventions({ domainId: DEFAULT_DOMAIN, limit: 50 });
    return reply.send({ success: true, interventions });
  });

  fastify.get("/growth-stats", async (_request, reply) => {
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const stats = await repository.getLeadStats({ domainId: DEFAULT_DOMAIN });
    return reply.send({ success: true, stats });
  });

  fastify.get("/leads", async (request, reply) => {
    const { type, opted_in, search, from, to, limit = 100, offset = 0 } = request.query;
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));

    const optedInBool = opted_in === "true" ? true : opted_in === "false" ? false : null;
    const { rows, total } = await repository.getGrowthLeadsFiltered({
      domainId: DEFAULT_DOMAIN,
      leadType: type || null,
      optedIn: optedInBool,
      search: search || null,
      from: from || null,
      to: to || null,
      limit: Math.min(parseInt(limit) || 100, 500),
      offset: parseInt(offset) || 0
    });
    return reply.send({ success: true, leads: rows, total, limit: parseInt(limit) || 100, offset: parseInt(offset) || 0 });
  });

  fastify.get("/audit-log", async (request, reply) => {
    const { username, action, from, to, limit = 100, offset = 0 } = request.query;
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const { rows, total } = await repository.getAuditLog({
      username: username || null,
      action:   action   || null,
      from:     from     || null,
      to:       to       || null,
      limit:    Math.min(parseInt(limit) || 100, 500),
      offset:   parseInt(offset) || 0
    });
    return reply.send({ success: true, events: rows, total });
  });

  fastify.get("/report", async (_request, reply) => {
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));

    const [overview, certStats, feedbackStats] = await Promise.all([
      repository.getAdminOverview({ domainId: DEFAULT_DOMAIN }),
      repository.getCertificateStats({ sinceDays: 7 }).catch(() => null),
      repository.pool.query(`
        SELECT
          COUNT(*)::int AS count_7d,
          ROUND(AVG(score), 2)::float AS avg_score_7d
        FROM ml_telemetry.user_feedback
        WHERE received_at >= NOW() - INTERVAL '7 days'
      `).catch(() => ({ rows: [{}] })),
    ]);

    const fb = feedbackStats?.rows?.[0] ?? {};

    return reply.send({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        domainId: DEFAULT_DOMAIN,
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
        operations: {
          uptime: process.uptime(),
          memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
          node: process.version,
        },
      },
    });
  });

  fastify.get("/feedback", async (request, reply) => {
    const { limit = 50, offset = 0 } = request.query;
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const items = await repository.listFeedback({
      limit:  Math.min(parseInt(limit)  || 50, 200),
      offset: parseInt(offset) || 0,
    });
    return reply.send({ success: true, feedback: items });
  });
}
