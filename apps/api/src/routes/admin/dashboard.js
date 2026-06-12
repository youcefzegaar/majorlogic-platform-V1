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

    const [overview, certStats, feedbackStats, freshness] = await Promise.all([
      repository.getAdminOverview({ domainId: DEFAULT_DOMAIN }),
      repository.getCertificateStats({ sinceDays: 7 }).catch(() => null),
      repository.getUserFeedbackStats({ sinceDays: 7 }).catch(() => null),
      repository.getCatalogFreshness({ domainId: DEFAULT_DOMAIN }).catch(() => null),
    ]);

    const fb = feedbackStats ?? {};

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
        catalog: {
          entityCount: freshness?.entityCount ?? null,
          oldestPublishedAt: freshness?.oldestPublishedAt ?? null,
          newestPublishedAt: freshness?.newestPublishedAt ?? null,
          oldestAgeHours: freshness?.oldestAgeHours ?? null,
          isStale: freshness?.isStale ?? null,
          slaHours: freshness?.slaHours ?? 24,
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

  // ── Sacrifice Vector Report ───────────────────────────────────────────────
  // Aggregates which constraints have been relaxed (hard sacrifices) and how
  // often, so the admin can see the platform's trade-off patterns at a glance.
  fastify.get("/sacrifice-report", async (request, reply) => {
    const { sinceDays = 30 } = request.query;
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();

    if (!repository) {
      // Return demo data when DB is unavailable so the UI is always usable
      return reply.send({
        success: true,
        demo: true,
        report: {
          domainId:   DEFAULT_DOMAIN,
          sinceDays:  Number(sinceDays),
          sampleSize: 0,
          hardSacrifices: [
            { constraint: "within_budget",    count: 0, label: "Budget Constraint",    avgIntegrityLoss: 0 },
            { constraint: "min_ram",          count: 0, label: "RAM Minimum",          avgIntegrityLoss: 0 },
            { constraint: "seller_trust_gate",count: 0, label: "Seller Trust Gate",    avgIntegrityLoss: 0 },
          ],
          topConstraint: null,
          generatedAt: new Date().toISOString(),
        }
      });
    }

    const limit = Math.min(parseInt(sinceDays) || 30, 365);
    const interventions = await repository.getRecentInterventions({
      domainId: DEFAULT_DOMAIN,
      limit: 500
    });

    // Aggregate by constraint ID
    const constraintCounts = {};
    const constraintLoss   = {};
    for (const row of interventions) {
      const key = row.relaxed_constraint ?? "unknown";
      constraintCounts[key] = (constraintCounts[key] ?? 0) + 1;
      constraintLoss[key]   = (constraintLoss[key] ?? 0) + (100 - (row.integrity_score ?? 100));
    }

    const hardSacrifices = Object.entries(constraintCounts)
      .map(([constraint, count]) => ({
        constraint,
        count,
        label: constraint.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        avgIntegrityLoss: count > 0 ? Math.round((constraintLoss[constraint] ?? 0) / count) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return reply.send({
      success: true,
      demo: false,
      report: {
        domainId:    DEFAULT_DOMAIN,
        sinceDays:   limit,
        sampleSize:  interventions.length,
        hardSacrifices,
        topConstraint: hardSacrifices[0]?.constraint ?? null,
        generatedAt: new Date().toISOString(),
      }
    });
  });

  // ── Cache Stats ───────────────────────────────────────────────────────────
  // Returns hit/miss/size for IR cache and Narrative cache.
  // Used by the Admin UI to monitor the KPI: 95%+ cache hit rate.
  fastify.get("/cache-stats", async (_request, reply) => {
    const { irCacheStats, narrativeCacheStats } = await import("../../../../packages/decision-orchestrator/src/index.js");
    return reply.send({
      success: true,
      ir:        irCacheStats(),
      narrative: narrativeCacheStats(),
      generatedAt: new Date().toISOString(),
    });
  });
}
