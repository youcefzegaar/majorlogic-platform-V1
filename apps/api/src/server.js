import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";

import { loadEnvFile } from "../../../scripts/env.js";
import { loadJsonSync } from "./db/repository.js";
import { getDomainController } from "./registry.js";
import { renderSearchPage, renderResultsPage } from "./views/templates.js";
import { renderDashboardHtml, renderOverviewHtml, renderLatestDecisionHtml } from "./views/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
loadEnvFile(path.join(root, ".env"));

const defaultProfile = loadJsonSync("examples/profile.json");
const port = Number(process.env.PORT ?? 3010);

const fastify = Fastify({ logger: true });

fastify.register(cors, { origin: true });

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
