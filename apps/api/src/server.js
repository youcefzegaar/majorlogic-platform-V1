import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";

import { loadEnvFile } from "../../../scripts/env.js";
import { loadJsonSync } from "./db/repository.js";
import { getDomainController } from "./registry.js";
import { renderSearchPage, renderResultsPage } from "./views/templates.js";
import { renderDashboardHtml, renderOverviewHtml, renderLatestDecisionHtml, renderGrowthLeadsHtml } from "./views/admin.js";
import { sendWelcomeEmail } from "../../../packages/email-service/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
loadEnvFile(path.join(root, ".env"));

const defaultProfile = loadJsonSync("examples/profile.json");
const port = Number(process.env.PORT ?? 3010);

const fastify = Fastify({ logger: true });

fastify.register(cors, { origin: true });

// Rate Limiting: protect growth and telemetry routes from spam bots
import fastifyRateLimit from "@fastify/rate-limit";
await fastify.register(fastifyRateLimit, {
  max: 30,
  timeWindow: "1 minute",
  // Only rate-limit mutation routes
  hook: "preHandler",
  keyGenerator: (req) => req.ip
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "..", "public"),
  prefix: "/public/"
});

const DEFAULT_DOMAIN = "laptop-student-us";

// ─────────────────────────────────────────────
// Headless API Routes (JSON only)
// ─────────────────────────────────────────────
fastify.get("/api/v1/health", async (request, reply) => {
  return { ok: true, service: "majorlogic-api" };
});

fastify.post("/api/v1/:domain/decision/run", async (request, reply) => {
  const { domain } = request.params;
  try {
    const controller = getDomainController(domain);
    const profile = request.body;
    const result = await controller.runPipeline(profile);
    return result;
  } catch (err) {
    reply.status(500).send({ error: "decision_run_failed", message: err.message });
  }
});

fastify.post("/api/v1/:domain/telemetry/click", async (request, reply) => {
  const { domain } = request.params;
  const { decisionRunId, entityId, clickType = "buy_now_clicked" } = request.body;

  if (!decisionRunId || !entityId) {
    return reply.status(400).send({ error: "missing_telemetry_fields", message: "decisionRunId and entityId required" });
  }

  try {
    const { getRepository } = await import("./db/repository.js");
    const repository = await getRepository();
    if (repository) {
      await repository.saveTelemetryClick({ decisionRunId, entityId, clickType });
      return { ok: true, logged: true, entityId };
    }
    return reply.status(503).send({ error: "db_offline_for_telemetry" });
  } catch (err) {
    reply.status(500).send({ error: "telemetry_logging_failed", message: err.message });
  }
});

// ─────────────────────────────────────────────
// Growth & Lead Capture Routes (3 Ethical Nets)
// ─────────────────────────────────────────────

fastify.post("/api/v1/:domain/growth/lead", async (request, reply) => {
  const { domain } = request.params;
  const { email, leadType, optedIn = false, trackingData = {} } = request.body;

  const VALID_LEAD_TYPES = ["save_results", "price_alert", "interstitial_gate"];

  if (!email || !leadType) {
    return reply.status(400).send({ error: "missing_lead_fields", message: "email and leadType are required" });
  }
  if (!VALID_LEAD_TYPES.includes(leadType)) {
    return reply.status(400).send({ error: "invalid_lead_type", message: `leadType must be one of: ${VALID_LEAD_TYPES.join(", ")}` });
  }
  // Basic email format guard
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return reply.status(400).send({ error: "invalid_email_format" });
  }

  try {
    const { getRepository } = await import("./db/repository.js");
    const repository = await getRepository();
    if (!repository) {
      return reply.status(503).send({ error: "db_offline" });
    }
    const lead = await repository.saveGrowthLead({
      domainId: domain,
      email,
      leadType,
      metadata: trackingData,
      optedIn
    });

    // Fire-and-forget welcome email (won't block response)
    sendWelcomeEmail({ email, leadType, metadata: trackingData })
      .catch(err => console.error("[Email] Failed:", err.message));

    const msg = lead.isDuplicate
      ? "Updated your preferences. Thanks!"
      : "Lead captured. Thank you!";
    return { ok: true, leadId: lead.id, leadType, isDuplicate: lead.isDuplicate, message: msg };
  } catch (err) {
    reply.status(500).send({ error: "lead_capture_failed", message: err.message });
  }
});

// CSV Export for Admin use (basic auth guard via secret query param)
fastify.get("/api/v1/:domain/growth/leads/export", async (request, reply) => {
  const { domain } = request.params;
  const { leadType = null, secret } = request.query;

  // Simple shared-secret guard — replace with proper auth in production
  if (secret !== (process.env.ADMIN_EXPORT_SECRET ?? "majorlogic-admin")) {
    return reply.status(401).send({ error: "unauthorized" });
  }

  try {
    const { getRepository } = await import("./db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });

    const leads = await repository.getGrowthLeads({ domainId: domain, leadType });

    // Build CSV
    const header = "id,email,lead_type,opted_in,decision_run_id,entity_id,created_at";
    const rows = leads.map(l => {
      const meta = l.metadata || {};
      return [
        l.id,
        l.email,
        l.lead_type,
        l.opted_in,
        meta.decisionRunId ?? "",
        meta.entityId ?? "",
        l.created_at
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    reply
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", `attachment; filename=leads-${domain}-${Date.now()}.csv`)
      .send(csv);
  } catch (err) {
    reply.status(500).send({ error: "export_failed", message: err.message });
  }
});

fastify.get("/api/v1/:domain/admin/dashboard", async (request, reply) => {
  const { domain } = request.params;
  try {
    const controller = getDomainController(domain);
    const data = await controller.buildAdminDashboardData();
    if (!data) return reply.status(503).send({ error: "database_unavailable" });
    return data;
  } catch (err) {
    reply.status(500).send({ error: "admin_request_failed", message: err.message });
  }
});

// ─────────────────────────────────────────────
// Web Routes (SSR HTML)
// ─────────────────────────────────────────────
fastify.get("/", async (request, reply) => {
  reply.redirect("/web/search");
});

fastify.get("/search", async (request, reply) => reply.redirect("/web/search"));
fastify.get("/results", async (request, reply) => reply.redirect(request.raw.url.replace("/results", "/web/results")));

fastify.get("/web/search", async (request, reply) => {
  const controller = getDomainController(DEFAULT_DOMAIN);
  const host = request.headers.host ?? `localhost:${port}`;
  const url = new URL(request.raw.url, `http://${host}`);
  
  const state = controller.buildSearchState(url.searchParams, defaultProfile);
  const html = renderSearchPage(state);
  reply.type("text/html; charset=utf-8").send(html);
});

fastify.get("/web/results", async (request, reply) => {
  const controller = getDomainController(DEFAULT_DOMAIN);
  const host = request.headers.host ?? `localhost:${port}`;
  const url = new URL(request.raw.url, `http://${host}`);
  
  const state = controller.buildSearchState(url.searchParams, defaultProfile);
  const result = await controller.runPipeline(state.profile);
  const html = renderResultsPage({ state, result });
  reply.type("text/html; charset=utf-8").send(html);
});

fastify.get("/admin", async (request, reply) => reply.redirect("/admin/dashboard"));

fastify.get("/admin/dashboard", async (request, reply) => {
  const controller = getDomainController(DEFAULT_DOMAIN);
  const data = await controller.buildAdminDashboardData();
  if (!data) {
    return reply.type("text/html").send("<h1>Database unavailable</h1>");
  }
  const html = renderDashboardHtml(data);
  reply.type("text/html; charset=utf-8").send(html);
});

fastify.get("/admin/overview", async (request, reply) => {
  const controller = getDomainController(DEFAULT_DOMAIN);
  const data = await controller.buildAdminDashboardData();
  if (!data) return reply.type("text/html").send("<h1>DB missing</h1>");
  const html = renderOverviewHtml(data.overview);
  reply.type("text/html; charset=utf-8").send(html);
});

fastify.get("/admin/decision-latest", async (request, reply) => {
  const controller = getDomainController(DEFAULT_DOMAIN);
  const data = await controller.buildAdminDashboardData();
  if (!data) return reply.type("text/html").send("<h1>DB missing</h1>");
  const html = renderLatestDecisionHtml(data.latestDecision);
  reply.type("text/html; charset=utf-8").send(html);
});

fastify.get("/admin/growth", async (request, reply) => {
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.type("text/html").send("<h1>DB unavailable</h1>");
  const stats = await repository.getLeadStats({ domainId: DEFAULT_DOMAIN });
  const html = renderGrowthLeadsHtml(stats);
  reply.type("text/html; charset=utf-8").send(html);
});

// Start Server
const start = async () => {
  try {
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`MajorLogic API headless + web running on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
