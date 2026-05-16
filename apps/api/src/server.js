import path from "node:path";
import fs   from "node:fs";
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
import { renderSeoPage } from "./views/seo-page.js";
import { renderPrivacyPolicy, renderTermsOfUse, renderDisclosure } from "./views/legal.js";
import fastifyHelmet from "@fastify/helmet";
import fastifyFormbody from "@fastify/formbody";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import bcrypt from "bcrypt";
import { renderLoginHtml } from "./views/login.js";
import { validateEnv } from "./config/validate-env.js";
import { createHmac } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
loadEnvFile(path.join(root, ".env"));

// CRITICAL: Validate environment before any other operation
validateEnv();

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const defaultProfile = loadJsonSync("examples/profile.json");
const port = Number(process.env.PORT ?? 3010);
const isProd = process.env.NODE_ENV === "production";

const fastify = Fastify({ 
  logger: {
    level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
    transport: isProd ? undefined : { target: 'pino-pretty' }
  } 
});

// Production security: Security Headers
fastify.register(fastifyHelmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
});

// CORS: restrict to known origins only
const ALLOWED_ORIGINS = [
  "https://majorlogic.ai",
  "https://www.majorlogic.ai",
  "http://localhost:3010", "http://127.0.0.1:3010", "http://localhost:5175", "http://localhost:5173", "http://localhost:5174", "http://localhost:5176"
];
fastify.register(cors, {
  origin: (origin, cb) => {
    // Allow same-origin requests (no origin header), null (sandboxed/local), and whitelisted domains
    if (!origin || origin === 'null' || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin '${origin}' not allowed`), false);
    }
  },
  credentials: true
});

fastify.register(fastifyFormbody);

// Environment validated via validateEnv() utility
const jwtSecret = process.env.JWT_SECRET;
const cookieSecret = process.env.COOKIE_SECRET;

fastify.register(fastifyJwt, {
  secret: jwtSecret,
  cookie: {
    cookieName: 'admin_token',
    signed: false
  }
});
fastify.register(fastifyCookie, {
  secret: cookieSecret,
  hook: 'onRequest'
});

// Rate Limiting: global protection against spam and DDoS
import fastifyRateLimit from "@fastify/rate-limit";
await fastify.register(fastifyRateLimit, {
  global: true,
  max: 120,
  timeWindow: "1 minute",
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: () => ({
    error: "too_many_requests",
    message: "Too many requests. Please slow down."
  })
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "..", "public"),
  prefix: "/public/"
});

const DEFAULT_DOMAIN = "laptop-student-us";

// ─────────────────────────────────────────────
// Admin Authentication (JWT)
// ─────────────────────────────────────────────

fastify.get("/admin/login", async (request, reply) => {
  reply.type("text/html").send(renderLoginHtml({ error: null }));
});

fastify.post("/admin/login", {
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
  const envPass = process.env.ADMIN_PASSWORD;

  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) {
    return reply.type("text/html").send(renderLoginHtml({ error: "Database offline" }));
  }

  let dbUser = await repository.getAdminUser(username);

  // Seeder logic: If no user in DB, and credentials match .env hash, seed it.
  if (!dbUser && username === envUser && envHash) {
    const isValidEnv = await bcrypt.compare(password, envHash);
    
    if (isValidEnv) {
      await repository.createAdminUser(username, envHash);
      dbUser = await repository.getAdminUser(username);
    }
  }

  // Check DB-level account lockout
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
    // Track failed attempts and lock after 5 failures for 15 minutes
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

  // Reset failed attempts on successful login
  await repository.resetLoginAttempts(username);

  const token = fastify.jwt.sign({ username });
  reply
    .setCookie('admin_token', token, {
      domain: isProd ? 'majorlogic.ai' : undefined,
      path: '/',
      secure: isProd,
      httpOnly: true,
      sameSite: true,
      maxAge: 86400 // 1 day
    })
    .redirect("/admin/dashboard");
});

fastify.get("/admin/logout", async (request, reply) => {
  reply.clearCookie('admin_token', { path: '/' }).redirect("/admin/login");
});

fastify.addHook("onRequest", async (req, reply) => {
  // Protect all /admin routes except login
  if (req.raw.url.startsWith("/admin") && !req.raw.url.startsWith("/admin/login")) {
    try {
      const token = req.cookies.admin_token;
      if (!token) throw new Error("No token");
      const decoded = fastify.jwt.verify(token);
      req.user = decoded;
    } catch (err) {
      req.log.error(`[AUTH ERROR] ${err.message}`);
      reply.redirect("/admin/login");
    }
  }
});

/**
 * Secure Export Token Generator
 * Returns a short-lived token for CSV exports to avoid leaking ADMIN_EXPORT_SECRET in HTML.
 */
fastify.get("/admin/export-token", async (request, reply) => {
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
  const sig = createHmac("sha256", process.env.ADMIN_EXPORT_SECRET)
    .update(String(expires)).digest("hex");
  return { token: `${expires}.${sig}`, expiresIn: 300 };
});

/**
 * Secure Export Redirect
 * Acts as a bridge between the authenticated session and the tokenized export URL.
 */
fastify.get("/admin/export-trigger/:domain", async (request, reply) => {
  const expires = Date.now() + 5 * 60 * 1000;
  const sig = createHmac("sha256", process.env.ADMIN_EXPORT_SECRET)
    .update(String(expires)).digest("hex");
  const token = `${expires}.${sig}`;
  const domain = request.params.domain;
  reply.redirect(`/api/v1/${domain}/growth/leads/export?token=${token}`);
});

fastify.get("/admin/account", async (request, reply) => {
  const { renderAccountSettingsHtml } = await import("./views/admin.js");
  reply.type("text/html; charset=utf-8").send(renderAccountSettingsHtml({ 
    username: request.user?.username || "Admin",
    message: request.query.msg,
    error: request.query.err
  }));
});

fastify.post("/admin/account/password", async (request, reply) => {
  const { currentPassword, newPassword, confirmPassword } = request.body;
  const username = request.user?.username;
  
  if (!username) return reply.redirect("/admin/login");
  
  // Strong password policy: 12+ chars, uppercase, lowercase, number, symbol
  const pwErrors = [];
  if (newPassword.length < 12) pwErrors.push("At least 12 characters");
  if (!/[A-Z]/.test(newPassword)) pwErrors.push("At least one uppercase letter");
  if (!/[a-z]/.test(newPassword)) pwErrors.push("At least one lowercase letter");
  if (!/[0-9]/.test(newPassword)) pwErrors.push("At least one number");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) pwErrors.push("At least one symbol");
  if (newPassword !== confirmPassword) pwErrors.push("Passwords do not match");
  
  if (pwErrors.length > 0) {
    return reply.redirect("/admin/account?err=" + encodeURIComponent(pwErrors.join(" · ")));
  }

  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  const dbUser = await repository.getAdminUser(username);
  
  if (!dbUser) return reply.redirect("/admin/login");

  const isValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
  if (!isValid) {
    return reply.redirect("/admin/account?err=" + encodeURIComponent("Current password is incorrect."));
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await repository.updateAdminPassword(username, newHash);
  
  reply.redirect("/admin/account?msg=" + encodeURIComponent("Password updated successfully."));
});

// ─────────────────────────────────────────────
// Headless API Routes (JSON only)
// ─────────────────────────────────────────────
fastify.get("/api/v1/health", async (request, reply) => {
  return { ok: true, service: "majorlogic-api" };
});

// robots.txt (served before rate limiter)
fastify.get("/robots.txt", async (request, reply) => {
  reply.type("text/plain").send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: https://majorlogic.ai/sitemap.xml`
  );
});

// sitemap.xml
fastify.get("/sitemap.xml", async (request, reply) => {
  const sitemapPath = path.join(__dirname, "..", "public", "sitemap.xml");
  if (!fs.existsSync(sitemapPath)) {
    return reply.status(404).send("Sitemap not generated yet. Run catalog-build.");
  }
  reply.type("application/xml").send(fs.readFileSync(sitemapPath, "utf8"));
});

fastify.post("/api/v1/:domain/decision/run", {
  schema: {
    body: {
      type: 'object',
      properties: {
        major: { type: 'string' },
        budgetUsd: { type: 'number', minimum: 100, maximum: 20000 },
        preferences: {
          type: 'object',
          additionalProperties: true
        },
        locale: { type: 'string' }
      },
      required: ['major', 'budgetUsd']
    }
  }
}, async (request, reply) => {
  const { domain } = request.params;
  try {
    const controller = getDomainController(domain);
    const profile = request.body;
    const result = await controller.runPipeline(profile);
    return result;
  } catch (err) {
    request.log.error({ err, domain }, "Decision run failed");
    reply.status(500).send({ error: "decision_run_failed", message: isProd ? "Internal Server Error" : err.message });
  }
});

// Global Error Handler
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (error.validation) {
    reply.status(400).send({ error: "validation_error", details: error.validation });
    return;
  }
  reply.status(500).send({ 
    error: "internal_error", 
    message: isProd ? "A server error occurred. Please try again later." : error.message 
  });
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

// Closed-loop Growth Feedback
fastify.post("/api/v1/:domain/feedback", async (request, reply) => {
  const { decisionRunId, score, comment, tags } = request.body;
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (repository) {
    await repository.saveFeedback({
      decisionRunId,
      score,
      comment,
      tags
    });
  }
  return { status: "received" };
});

fastify.get("/admin/dashboard", async (request, reply) => {
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  const data = await repository.getAdminOverview({ domainId: DEFAULT_DOMAIN });
  const interventions = await repository.getRecentInterventions({ domainId: DEFAULT_DOMAIN, limit: 5 });
  
  return reply.send({
    success: true,
    data: {
      ...data,
      latestInterventions: interventions
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node: process.version
    }
  });
});

fastify.get("/admin/domains", async (request, reply) => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const domainsDir = path.resolve(process.cwd(), "domains");
  
  // لغرض العرض، سنقوم بمسح المجلدات واسترداد الإعدادات
  const domainFolders = ["laptop-student-us"]; // يمكننا تحسين هذا لاحقاً لمسح المجلدات آلياً
  
  const domains = await Promise.all(domainFolders.map(async (slug) => {
    try {
      const configPath = path.join(domainsDir, slug, "decision-config.json");
      const configRaw = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(configRaw);
      
      return {
        id: slug,
        slug: slug,
        title: slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        version: config.version || "1.0.0",
        is_active: true,
        updated_at: new Date().toISOString(),
        config: config
      };
    } catch (e) {
      return null;
    }
  }));

  return { success: true, domains: domains.filter(Boolean) };
});

fastify.get("/admin/decision-trace/:id", async (request, reply) => {
  const { id } = request.params;
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  const trace = await repository.getDecisionTrace(id);
  if (!trace) return reply.status(404).send({ error: "Trace not found" });
  return { success: true, trace };
});

fastify.post("/admin/simulate", async (request, reply) => {
  const { domainId, modifications, sampleSize } = request.body;
  const { simulateImpact } = await import("../../../packages/admin-decision-api/src/index.js");
  const report = await simulateImpact(domainId, modifications, sampleSize || 100);
  return { success: true, report };
});

// JSON API for Interventions
fastify.get("/admin/interventions-data", async (request, reply) => {
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.status(503).send({ error: "db_offline" });
  const interventions = await repository.getRecentInterventions({ domainId: DEFAULT_DOMAIN, limit: 50 });
  return { success: true, interventions };
});

// JSON API for Growth Stats
fastify.get("/admin/growth-stats", async (request, reply) => {
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.status(503).send({ error: "db_offline" });
  const stats = await repository.getLeadStats({ domainId: DEFAULT_DOMAIN });
  return { success: true, stats };
});

// JSON API for Affiliate Settings
fastify.get("/admin/affiliate-settings", async (request, reply) => {
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.status(503).send({ error: "db_offline" });
  const settings = await repository.getAffiliateSettings();
  return { success: true, settings };
});

fastify.post("/admin/affiliate-settings", async (request, reply) => {
  const { seller, affiliateTag, isActive, notes } = request.body;
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.status(503).send({ error: "db_offline" });
  
  await repository.saveAffiliateTag({
    seller,
    affiliateTag,
    isActive,
    notes
  });
  return { success: true };
});

// JSON API for Logic Lab
fastify.get("/admin/logic-config/:domainId", async (request, reply) => {
  const { domainId } = request.params;
  const { getRuleset } = await import("./db/repository.js");
  const config = await getRuleset(`domains/${domainId}/decision-config.json`);
  return { success: true, config };
});

fastify.post("/admin/logic-config/:domainId", async (request, reply) => {
  const { domainId } = request.params;
  const config = request.body;
  const { getRepository, clearRulesetCache } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.status(503).send({ error: "db_offline" });
  
  await repository.saveDecisionLogic(domainId, config);
  clearRulesetCache();
  return { success: true, version: config.version };
});

// CSV Export for Admin use (basic auth guard via secret query param)
fastify.get("/api/v1/:domain/growth/leads/export", async (request, reply) => {
  const { domain } = request.params;
  const { leadType = null, secret, token } = request.query;

  let isAuthorized = false;

  // 1. Validate via Short-lived Token (Safe for browser links)
  if (token) {
    const [expires, sig] = token.split('.');
    if (expires && sig && Date.now() < parseInt(expires)) {
      const expected = createHmac("sha256", process.env.ADMIN_EXPORT_SECRET)
        .update(expires).digest("hex");
      if (sig === expected) isAuthorized = true;
    }
  }

  // 2. Validate via Static Secret (Internal/Legacy API)
  const exportSecret = process.env.ADMIN_EXPORT_SECRET;
  if (!isAuthorized && exportSecret && secret === exportSecret) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
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
  reply.redirect("http://localhost:5173");
});

fastify.get("/search", async (request, reply) => reply.redirect("http://localhost:5173"));
fastify.get("/results", async (request, reply) => {
  const url = new URL(request.raw.url, "http://localhost:5173");
  reply.redirect(url.toString());
});

// ─────────────────────────────────────────────
// Legal Pages
// ─────────────────────────────────────────────
fastify.get("/privacy", async (request, reply) => {
  reply.type("text/html; charset=utf-8").send(renderPrivacyPolicy());
});
fastify.get("/terms", async (request, reply) => {
  reply.type("text/html; charset=utf-8").send(renderTermsOfUse());
});
fastify.get("/disclosure", async (request, reply) => {
  reply.type("text/html; charset=utf-8").send(renderDisclosure());
});
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
  const html = renderResultsPage({ state, result, requestUrl: url.toString() });
  reply.type("text/html; charset=utf-8").send(html);
});

fastify.get("/admin", async (request, reply) => {
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.type("text/html").send("<h1>DB Offline</h1>");
  
  const overview = await repository.getAdminOverview({ domainId: DEFAULT_DOMAIN });
  const controller = getDomainController(DEFAULT_DOMAIN);
  const adminData = await controller.buildAdminDashboardData();

  const html = renderDashboardHtml({ 
    overview, 
    latestDecision: adminData?.latestDecision 
  });
  return reply.type("text/html; charset=utf-8").send(html);
});

fastify.get("/admin/interventions", async (request, reply) => {
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.type("text/html").send("<h1>DB Offline</h1>");
  
  const interventions = await repository.getRecentInterventions({ domainId: DEFAULT_DOMAIN, limit: 50 });
  const { renderInterventionsHtml } = await import("./views/admin_interventions.js");
  
  const html = renderInterventionsHtml(interventions);
  return reply.type("text/html; charset=utf-8").send(html);
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

fastify.get("/admin/affiliate", async (request, reply) => {
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.type("text/html").send("<h1>DB unavailable</h1>");
  const settings = await repository.getAffiliateSettings();
  const { renderAffiliateSettingsHtml } = await import("./views/admin.js");
  reply.type("text/html; charset=utf-8").send(renderAffiliateSettingsHtml(settings));
});

// Logic Lab — No-Code Editor
fastify.get("/admin/logic", async (request, reply) => {
  const { getRepository, getRuleset } = await import("./db/repository.js");
  const { renderLogicLabHtml } = await import("./views/admin_logic_lab.js");
  
  const domainId = DEFAULT_DOMAIN;
  const config = await getRuleset(`domains/${domainId}/decision-config.json`);
  
  return reply.type("text/html; charset=utf-8").send(renderLogicLabHtml({ config, domainId }));
});

fastify.post("/admin/logic/save", async (request, reply) => {
  const body = request.body;
  const domainId = DEFAULT_DOMAIN;
  
  const { getRuleset, getRepository } = await import("./db/repository.js");
  const configPath = `domains/${domainId}/decision-config.json`;
  const config = await getRuleset(configPath);

  // Update Gates
  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith("gate_")) {
      const [, id, field] = key.split("_");
      if (!config.gates[id]) continue;
      if (field === "meaning") config.gates[id].humanMeaning = value;
      if (field === "weight") config.gates[id].weight = parseFloat(value);
    }
    // Update Weights
    if (key.startsWith("weight_")) {
      const [, rulesetId, metric] = key.split("_");
      if (config.rulesets[rulesetId] && config.rulesets[rulesetId].weights) {
        config.rulesets[rulesetId].weights[metric] = parseFloat(value);
      }
    }
  }

  // Update version
  const [major, minor, patch] = config.version.split(".").map(Number);
  config.version = `${major}.${minor}.${patch + 1}`;

  // Save to Database
  const repository = await getRepository();
  if (repository) {
    await repository.saveDecisionLogic(domainId, config);
    request.log.info({ domainId, version: config.version }, "[ADMIN] Logic saved to database");
  } else {
    // Fallback or Error if DB is required but offline
    request.log.error("[ADMIN] Database offline, cannot save logic safely.");
    return reply.status(503).send("Database offline. Logic cannot be saved.");
  }

  // Clear cache to ensure next decision run uses fresh logic
  const { clearRulesetCache } = await import("./db/repository.js");
  clearRulesetCache();
  
  return reply.redirect("/admin/logic?saved=true");
});

// Save affiliate tag from admin form (POST)
fastify.post("/admin/affiliate", async (request, reply) => {
  const { seller, affiliateTag, isActive, notes } = request.body;
  if (!seller) return reply.status(400).send({ error: "seller is required" });

  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.status(503).send({ error: "db_offline" });

  await repository.saveAffiliateTag({
    seller,
    affiliateTag: affiliateTag ?? "",
    isActive: isActive !== "false" && isActive !== false,
    notes: notes ?? null
  });

  reply.redirect(302, "/admin/affiliate?saved=1");
});

// JSON API for affiliate settings (for external tools)
fastify.get("/api/v1/admin/affiliate-settings", async (request, reply) => {
  const { secret } = request.query;
  const exportSecret = process.env.ADMIN_EXPORT_SECRET;
  if (!exportSecret || secret !== exportSecret) {
    return reply.status(401).send({ error: "unauthorized" });
  }
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.status(503).send({ error: "db_offline" });
  const settings = await repository.getAffiliateSettings();
  return settings;
});

// ─────────────────────────────────────────────
// Ethical Affiliate Gateway (logs click → 302 to real URL)
// ─────────────────────────────────────────────

fastify.get("/go/:domain/:entityId", async (request, reply) => {
  const { domain, entityId } = request.params;
  const { seller = "", ref = "results" } = request.query;

  try {
    const { getRepository } = await import("./db/repository.js");
    const repository = await getRepository();

    let affiliateUrl = null;
    let targetOffer = null;

    if (repository) {
      // 🔑 Load live affiliate tags from admin dashboard settings
      const affiliateTagMap = await repository.getAffiliateTagMap();

      const entities = await repository.getPublishedEntities({ domainId: domain, limit: 500 });
      const entity = entities.find(e => e.entityId === entityId || e.title === entityId);

      if (entity) {
        const offers = entity.market?.offers || [];
        targetOffer = seller
          ? offers.find(o => o.seller === seller)
          : offers.sort((a, b) => a.priceUsd - b.priceUsd)[0];

        if (targetOffer) {
          affiliateUrl = targetOffer.affiliateUrl || null;

          // 🔄 Override/inject affiliate tag dynamically from DB settings
          if (affiliateUrl && affiliateTagMap[targetOffer.seller]) {
            const { tag, paramKey } = affiliateTagMap[targetOffer.seller];
            try {
              const url = new URL(affiliateUrl);
              url.searchParams.set(paramKey, tag);   // overrides any hardcoded tag
              affiliateUrl = url.toString();
            } catch {
              // URL parse failed — use as-is
            }
          }

          // 📊 Log affiliate click with which tag was actually used
          const usedTag = affiliateTagMap[targetOffer.seller]?.tag ?? null;
          repository.client.query(
            `INSERT INTO ml_telemetry.affiliate_clicks
             (domain_id, entity_id, seller, seller_type, price_usd, condition, is_affiliate)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [domain, entityId, targetOffer.seller, targetOffer.sellerType ?? null,
             targetOffer.priceUsd, targetOffer.condition, targetOffer.affiliate === true]
          ).catch(err => console.error("[AffiliateGateway] Click log failed:", err.message));
        }
      }
    }

    if (!affiliateUrl) {
      // Fallback: Amazon search with live tag from DB or default
      const { getRepository: gr } = await import("./db/repository.js");
      const repo2 = await gr();
      const tagMap = repo2 ? await repo2.getAffiliateTagMap() : {};
      const amazonTag = tagMap["Amazon"]?.tag ?? process.env.DEFAULT_AFFILIATE_TAG ?? "majorlogic-20";
      affiliateUrl = `https://www.amazon.com/s?k=${encodeURIComponent(entityId)}&tag=${amazonTag}`;
    }

    reply.redirect(302, affiliateUrl);

  } catch (err) {
    console.error("[AffiliateGateway] Error:", err.message);
    reply.redirect(302, `https://www.amazon.com/s?k=${encodeURIComponent(entityId)}&tag=majorlogic-20`);
  }
});


// ─────────────────────────────────────────────────────────────────
// Programmatic SEO Landing Pages
// /laptops/:major           → best laptops for that major (any budget)
// /laptops/:major/:budget   → best laptops for major + budget tier
// ─────────────────────────────────────────────────────────────────

const SEO_PAGES_DIR = path.join(root, "domains/laptop-student-us/generated/seo-pages");

function loadSeoPage(major, budget = "any-budget") {
  const filePath = path.join(SEO_PAGES_DIR, `${major}__${budget}.json`);
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

// /laptops/:major  (e.g. /laptops/computer-science)
fastify.get("/laptops/:major", async (request, reply) => {
  const { major } = request.params;
  const pageData = loadSeoPage(major, "any-budget");
  if (!pageData) {
    return reply.status(404).type("text/html").send(`
      <html><body style="font-family:sans-serif;background:#0d0d1a;color:#e0e0e0;padding:32px;text-align:center;">
        <h1>🔍 Generating results for "${major}"...</h1>
        <p>Run <code>node scripts/catalog-build.js --domain=laptop-student-us</code> to generate SEO pages.</p>
        <a href="/search" style="color:#7C3AED;">← Use the interactive tool instead</a>
      </body></html>`);
  }
  reply.type("text/html; charset=utf-8").send(renderSeoPage(pageData));
});

// /laptops/:major/:budget  (e.g. /laptops/computer-science/under-1500)
fastify.get("/laptops/:major/:budget", async (request, reply) => {
  const { major, budget } = request.params;
  const pageData = loadSeoPage(major, budget);
  if (!pageData) {
    // Redirect to the major page as a graceful fallback
    return reply.redirect(302, `/laptops/${major}`);
  }
  reply.type("text/html; charset=utf-8").send(renderSeoPage(pageData));
});

// /laptops  → index of all available landing pages
fastify.get("/laptops", async (request, reply) => {
  const indexPath = path.join(SEO_PAGES_DIR, "_index.json");
  let pages = [];
  if (fs.existsSync(indexPath)) {
    try { pages = JSON.parse(fs.readFileSync(indexPath, "utf8")).pages ?? []; } catch {}
  }
  const links = pages.map(p =>
    `<li><a href="${p.canonical}" style="color:#7C3AED;text-decoration:none;">${escapeHtml(p.h1)}</a></li>`
  ).join("");

  reply.type("text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8"/>
  <title>Laptop Guides by Major — MajorLogic</title>
  <meta name="description" content="Find the best laptop for your college major. Independent, spec-based recommendations for CS, engineering, design, medical, and more."/>
  <link rel="canonical" href="https://majorlogic.ai/laptops"/>
  <style>body{font-family:system-ui,sans-serif;background:#0d0d1a;color:#e0e0e0;max-width:800px;margin:0 auto;padding:32px 20px;}
  a{color:#7C3AED;} h1{color:#fff;} li{margin-bottom:10px;font-size:16px;}</style>
</head><body>
  <a href="/" style="font-size:14px;">← MajorLogic</a>
  <h1 style="margin-top:16px;">📚 Laptop Guides by Major & Budget</h1>
  <p style="color:#9ca3af;">Algorithm-generated. Affiliate-disclosed. Updated weekly.</p>
  <ul style="list-style:none;padding:0;margin-top:24px;">${links || "<li>No pages generated yet. Run catalog-build.</li>"}</ul>
  <a href="/search" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:24px;">🎯 Get Personalized Recommendation</a>
</body></html>`);
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
