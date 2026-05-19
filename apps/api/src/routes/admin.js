import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { createHmac } from "node:crypto";
import { renderLoginHtml } from "../views/login.js";

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
const adminDistDir = path.resolve(__dirname, "../../../admin-ui/dist");

// Actions to record in the audit log: method + url pattern → action label
const AUDIT_ACTIONS = [
  { method: "POST",   pattern: /^\/admin\/login$/,                      action: "login" },
  { method: "GET",    pattern: /^\/admin\/logout$/,                     action: "logout" },
  { method: "POST",   pattern: /^\/admin\/account\/password\/json$/,    action: "change_password" },
  { method: "POST",   pattern: /^\/admin\/logic-config\//,              action: "save_logic" },
  { method: "POST",   pattern: /^\/admin\/simulate$/,                   action: "simulate" },
  { method: "POST",   pattern: /^\/admin\/affiliate-settings$/,         action: "update_affiliate" },
  { method: "GET",    pattern: /^\/admin\/export-trigger\//,            action: "export_leads" },
  { method: "GET",    pattern: /^\/admin\/export-token$/,               action: "export_token" },
  { method: "POST",   pattern: /^\/admin\/integrations\/[^/]+$/,        action: "update_integration" },
  { method: "POST",   pattern: /^\/admin\/integrations$/,               action: "add_integration" },
  { method: "DELETE", pattern: /^\/admin\/integrations\/[^/]+\/credentials$/, action: "revoke_integration" },
  { method: "POST",   pattern: /^\/admin\/integrations\/[^/]+\/test$/,  action: "test_integration" },
  { method: "POST",   pattern: /^\/admin\/catalog\/rebuild$/,           action: "catalog_rebuild" },
];

function getAuditAction(method, url) {
  const path = url.split("?")[0];
  const match = AUDIT_ACTIONS.find(a => a.method === method && a.pattern.test(path));
  return match?.action ?? null;
}

export default async function adminRoutes(fastify, { DEFAULT_DOMAIN }) {

  // ── Audit Log Hook ────────────────────────────────────────────────────────
  fastify.addHook("onResponse", async (req, reply) => {
    const action = getAuditAction(req.method, req.raw.url ?? "");
    if (!action) return;
    const username = req.user?.username ?? (action === "login" ? (req.body?.username ?? "unknown") : "unknown");
    const status   = reply.statusCode < 400 ? "success" : "error";
    try {
      const { getRepository } = await import("../db/repository.js");
      const repo = await getRepository();
      if (!repo) return;
      const resource = req.params?.domainId ?? req.params?.domain ?? null;
      const details  = {};
      if (action === "save_logic" && req.body?.version) details.version = req.body.version;
      if (action === "simulate"   && req.body?.domainId) details.domainId = req.body.domainId;
      if (action === "export_leads") details.domain = req.params?.domain ?? DEFAULT_DOMAIN;
      await repo.logAuditEvent({ username, action, resource, details, ip: req.ip, status });
    } catch {
      // Audit failure must never break the request
    }
  });

  // ── Auth (SSR — runs before React loads) ─────────────────────────────────

  fastify.get("/login", async (_request, reply) => {
    reply.type("text/html").send(renderLoginHtml({ error: null }));
  });

  fastify.post("/login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
        keyGenerator: (req) => req.ip,
        errorResponseBuilder: (req, context) => {
          const retryAfter = Math.ceil(context.ttl / 1000);
          req.log.warn({ ip: req.ip }, "[BRUTE FORCE] Login rate limit exceeded");
          return renderLoginHtml({ error: `Too many failed attempts. Please wait ${retryAfter} seconds before trying again.` });
        }
      }
    }
  }, async (request, reply) => {
    const { username, password } = request.body || {};
    const envUser = process.env.ADMIN_USER;
    const envHash = process.env.ADMIN_PASSWORD_HASH;

    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) {
      return reply.type("text/html").send(renderLoginHtml({ error: "Database offline" }));
    }

    let dbUser = await repository.getAdminUser(username);

    if (username === envUser && envHash) {
      const isValidEnv = await bcrypt.compare(password, envHash);
      if (isValidEnv) {
        if (dbUser) {
          await repository.updateAdminPassword(username, envHash);
        } else {
          await repository.createAdminUser(username, envHash);
        }
        dbUser = await repository.getAdminUser(username);
      }
    }

    if (dbUser?.locked_until && new Date() < new Date(dbUser.locked_until)) {
      const remaining = Math.ceil((new Date(dbUser.locked_until) - new Date()) / 60000);
      return reply.type("text/html").send(
        renderLoginHtml({ error: `Account locked. Try again in ${remaining} minute(s).` })
      );
    }

    let isValid = false;
    if (dbUser) {
      isValid = await bcrypt.compare(password, dbUser.password_hash);
    }

    if (!isValid) {
      if (dbUser) {
        const attempts = (dbUser.failed_login_attempts || 0) + 1;
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await repository.updateLoginAttempts(username, attempts, lockedUntil);
        if (lockedUntil) {
          request.log.warn({ ip: request.ip, username }, "[SECURITY] Account locked after 5 failed attempts");
        }
      }
      return reply.type("text/html").send(renderLoginHtml({ error: "Invalid username or password" }));
    }

    await repository.resetLoginAttempts(username);

    const isProd = process.env.NODE_ENV === "production";
    const token = fastify.jwt.sign({ username });
    reply
      .setCookie("admin_token", token, {
        domain: isProd ? "majorlogic.tech" : undefined,
        path: "/",
        secure: isProd,
        httpOnly: true,
        sameSite: "strict",
        maxAge: 86400
      })
      .redirect("/admin/", 302);
  });

  fastify.get("/logout", async (_request, reply) => {
    reply.clearCookie("admin_token", { path: "/" }).redirect("/admin/login", 302);
  });

  // ── Password (JSON API for React SPA) ────────────────────────────────────

  fastify.post("/account/password/json", async (request, reply) => {
    const { currentPassword, newPassword, confirmPassword } = request.body;
    const username = request.user?.username;

    if (!username) return reply.status(401).send({ success: false, error: "Not authenticated" });

    const pwErrors = [];
    if (!newPassword || newPassword.length < 12) pwErrors.push("At least 12 characters");
    if (!/[A-Z]/.test(newPassword)) pwErrors.push("At least one uppercase letter");
    if (!/[a-z]/.test(newPassword)) pwErrors.push("At least one lowercase letter");
    if (!/[0-9]/.test(newPassword)) pwErrors.push("At least one number");
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) pwErrors.push("At least one symbol");
    if (newPassword !== confirmPassword) pwErrors.push("New passwords do not match");

    if (pwErrors.length > 0) {
      return reply.status(400).send({ success: false, errors: pwErrors });
    }

    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    const dbUser = await repository.getAdminUser(username);

    if (!dbUser) return reply.status(404).send({ success: false, error: "User not found" });

    const isValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isValid) {
      return reply.status(400).send({ success: false, errors: ["Current password is incorrect"] });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await repository.updateAdminPassword(username, newHash);
    return reply.send({ success: true, message: "Password updated successfully" });
  });

  // ── Export Tokens ─────────────────────────────────────────────────────────

  fastify.get("/export-token", async (_request, reply) => {
    const expires = Date.now() + 5 * 60 * 1000;
    const sig = createHmac("sha256", process.env.ADMIN_EXPORT_SECRET)
      .update(String(expires)).digest("hex");
    return reply.send({ token: `${expires}.${sig}`, expiresIn: 300 });
  });

  fastify.get("/export-trigger/:domain", async (request, reply) => {
    const expires = Date.now() + 5 * 60 * 1000;
    const sig = createHmac("sha256", process.env.ADMIN_EXPORT_SECRET)
      .update(String(expires)).digest("hex");
    const token = `${expires}.${sig}`;
    const { domain } = request.params;
    reply.redirect(`/api/v1/${domain}/growth/leads/export?token=${token}`, 302);
  });

  // ── JSON APIs (consumed by React SPA) ────────────────────────────────────

  fastify.get("/dashboard", async (_request, reply) => {
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });

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
    const domainsDir = resolve(process.cwd(), "domains");
    const domainFolders = ["laptop-student-us"];

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
      } catch {
        return null;
      }
    }));

    return reply.send({ success: true, domains: domains.filter(Boolean) });
  });

  fastify.get("/decision-trace/:id", async (request, reply) => {
    const { id } = request.params;
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    const trace = await repository.getDecisionTrace(id);
    if (!trace) return reply.status(404).send({ error: "Trace not found" });
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
    const { simulateImpact } = await import("../../../../packages/admin-decision-api/src/index.js");
    const report = await simulateImpact(domainId, modifications, sampleSize);
    return reply.send({ success: true, report });
  });

  fastify.get("/interventions-data", async (_request, reply) => {
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    const interventions = await repository.getRecentInterventions({ domainId: DEFAULT_DOMAIN, limit: 50 });
    return reply.send({ success: true, interventions });
  });

  fastify.get("/growth-stats", async (_request, reply) => {
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    const stats = await repository.getLeadStats({ domainId: DEFAULT_DOMAIN });
    return reply.send({ success: true, stats });
  });

  fastify.get("/leads", async (request, reply) => {
    const { type, opted_in, search, from, to, limit = 100, offset = 0 } = request.query;
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });

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
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
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

  // ── Integrations (Secrets Manager) ───────────────────────────────────────

  fastify.get("/integrations", async (_request, reply) => {
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    const integrations = await repository.getIntegrations();
    return reply.send({ success: true, integrations });
  });

  fastify.post("/integrations/:slug", async (request, reply) => {
    const { slug } = request.params;
    const { credentials, config, is_active, name, description } = request.body;
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    await repository.saveIntegration(slug, { credentials, config, is_active, name, description });
    const { clearIntegrationCache } = await import("../services/integrationService.js");
    clearIntegrationCache();
    return reply.send({ success: true });
  });

  fastify.post("/integrations", async (request, reply) => {
    const { slug, name, description, category, icon_emoji, credentials, config } = request.body;
    if (!slug || !name) return reply.status(400).send({ error: "slug and name are required" });
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    await repository.addCustomIntegration({ slug, name, description, category, icon_emoji, credentials, config });
    return reply.send({ success: true });
  });

  fastify.delete("/integrations/:slug/credentials", async (request, reply) => {
    const { slug } = request.params;
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    await repository.deleteIntegrationCredentials(slug);
    return reply.send({ success: true });
  });

  fastify.delete("/integrations/:slug", async (request, reply) => {
    const { slug } = request.params;
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    await repository.deleteIntegration(slug);
    const { clearIntegrationCache } = await import("../services/integrationService.js");
    clearIntegrationCache();
    return reply.send({ success: true });
  });

  fastify.post("/integrations/:slug/test", async (request, reply) => {
    const { slug } = request.params;
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    const integration = await repository.getIntegrationBySlug(slug);
    if (!integration) return reply.status(404).send({ error: "Integration not found" });

    let ok;
    let message;

    try {
      if (slug === "claude") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: integration.config?.model ?? "claude-haiku-4-5-20251001", max_tokens: 10, messages: [{ role: "user", content: "ping" }] })
        });
        ok = res.ok;
        message = ok ? "Claude API connected successfully." : `Claude API error: ${res.status}`;

      } else if (slug === "openai") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
        ok = res.ok;
        message = ok ? "OpenAI API connected successfully." : `OpenAI error: ${res.status}`;

      } else if (slug === "sendgrid") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch("https://api.sendgrid.com/v3/user/account", { headers: { Authorization: `Bearer ${key}` } });
        ok = res.ok;
        message = ok ? "SendGrid connected successfully." : `SendGrid error: ${res.status}`;

      } else if (slug === "slack_webhook" || slug === "zapier") {
        const url = integration.credentials?.webhook_url;
        if (!url) throw new Error("No webhook URL configured");
        const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "MajorLogic ping 🔔" }) });
        ok = res.ok || res.status === 400; // Slack/Zapier return 400 for test pings (expected)
        message = ok ? "Webhook reachable." : `Webhook error: ${res.status}`;

      } else if (slug === "postgres_read") {
        const url = integration.credentials?.connection_url;
        if (!url) throw new Error("No connection URL configured");
        // security: direct DB client usage moved to service layer (Direct DB Access fix).
        const { testPostgresConnection } = await import("../services/integrationService.js");
        await testPostgresConnection(url);
        ok = true;
        message = "Database connection successful.";

      } else if (slug === "redis") {
        message = "Redis test requires server-side connection — mark as manually verified.";
        ok = true;

      } else if (slug === "reddit") {
        const { client_id, client_secret, user_agent } = integration.credentials;
        if (!client_id || !client_secret) throw new Error("client_id and client_secret required");
        const auth = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
        const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "User-Agent": user_agent ?? "MajorLogic/1.0", "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=client_credentials"
        });
        ok = tokenRes.ok;
        message = ok ? "Reddit API authenticated successfully." : `Reddit auth failed: ${tokenRes.status}`;

      } else if (slug === "youtube") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${key}`);
        ok = res.ok;
        message = ok ? "YouTube Data API connected." : `YouTube error: ${res.status}`;

      } else if (slug === "bestbuy") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch(`https://api.bestbuy.com/v1/products((type=laptop))?format=json&pageSize=1&apiKey=${key}`);
        ok = res.ok;
        message = ok ? "Best Buy API connected." : `Best Buy error: ${res.status}`;

      } else if (slug === "google_search") {
        const { api_key, cx } = integration.credentials;
        if (!api_key || !cx) throw new Error("api_key and cx (Search Engine ID) required");
        const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${api_key}&cx=${cx}&q=test&num=1`);
        ok = res.ok;
        message = ok ? "Google Custom Search connected." : `Google Search error: ${res.status}`;

      } else if (slug === "serpapi") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch(`https://serpapi.com/account?api_key=${key}`);
        ok = res.ok;
        message = ok ? "SerpAPI connected." : `SerpAPI error: ${res.status}`;

      } else if (slug === "trustpilot") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch(`https://api.trustpilot.com/v1/resources/images`, { headers: { apikey: key } });
        ok = res.ok;
        message = ok ? "Trustpilot API connected." : `Trustpilot error: ${res.status}`;

      } else {
        message = "No automated test for this integration. Mark as verified manually.";
        ok = true;
      }
    } catch (err) {
      ok = false;
      message = err.message;
    }

    await repository.setIntegrationTestResult(slug, ok);
    return reply.send({ success: true, ok, message });
  });

  fastify.get("/affiliate-settings", async (_request, reply) => {
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    const settings = await repository.getAffiliateSettings();
    return reply.send({ success: true, settings });
  });

  fastify.post("/affiliate-settings", async (request, reply) => {
    const { seller, affiliateTag, isActive, notes } = request.body;
    const { getRepository } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    await repository.saveAffiliateTag({ seller, affiliateTag, isActive, notes });
    return reply.send({ success: true });
  });

  fastify.get("/logic-config/:domainId", async (request, reply) => {
    const { domainId } = request.params;
    const { getRuleset } = await import("../db/repository.js");
    const config = await getRuleset(`domains/${domainId}/decision-config.json`);
    return reply.send({ success: true, config });
  });

  fastify.post("/logic-config/:domainId", {
    schema: {
      body: {
        type: "object",
        properties: {
          version: { type: "string", maxLength: 20 },
          gates:   { type: "object", additionalProperties: true },
          rulesets:{ type: "object", additionalProperties: true }
        },
        required: ["version"],
        additionalProperties: true,
        maxProperties: 200
      }
    }
  }, async (request, reply) => {
    const { domainId } = request.params;
    const config = request.body;
    const { getRepository, clearRulesetCache } = await import("../db/repository.js");
    const repository = await getRepository();
    if (!repository) return reply.status(503).send({ error: "db_offline" });
    await repository.saveDecisionLogic(domainId, config);
    clearRulesetCache();
    return reply.send({ success: true, version: config.version });
  });

  // ── Catalog Rebuild ───────────────────────────────────────────────────────

  fastify.post("/catalog/rebuild", async (request, reply) => {
    const { domainId } = request.body ?? {};
    if (!domainId) return reply.status(400).send({ error: "domainId is required" });

    // Reject if a rebuild for this domain is already running
    for (const job of _catalogJobs.values()) {
      if (job.domainId === domainId && job.status === "running") {
        return reply.status(409).send({ error: "rebuild_running", jobId: job.id });
      }
    }

    _purgeStaleCatalogJobs();

    const jobId = randomUUID();
    const job = { id: jobId, domainId, status: "running", logs: [], startedAt: Date.now(), finishedAt: null };
    _catalogJobs.set(jobId, job);

    // Resolve repo root (4 levels up from routes/)
    const repoRoot = path.resolve(__dirname, "../../../..");
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

    proc.on("close", (code) => {
      job.status = code === 0 ? "done" : "error";
      job.finishedAt = Date.now();
    });

    return reply.status(202).send({ jobId, status: "running" });
  });

  fastify.get("/catalog/rebuild/:jobId", async (request, reply) => {
    const job = _catalogJobs.get(request.params.jobId);
    if (!job) return reply.status(404).send({ error: "job_not_found" });
    return reply.send({
      jobId: job.id,
      domainId: job.domainId,
      status: job.status,
      logs: job.logs,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt
    });
  });

  // ── SPA Catch-all (must be last) ─────────────────────────────────────────
  // Serves React SPA index.html for all /admin/* routes not matched above.
  // React handles client-side routing (dashboard, logic, affiliate, etc.)

  fastify.get("/*", async (_request, reply) => {
    return reply.sendFile("index.html", adminDistDir);
  });
}
