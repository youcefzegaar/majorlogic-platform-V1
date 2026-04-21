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
import fastifyBasicAuth from "@fastify/basic-auth";
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
// Admin Authentication (Basic Auth)
// ─────────────────────────────────────────────
fastify.register(fastifyBasicAuth, {
  validate: async function (username, password, req, reply) {
    const validUser = process.env.ADMIN_USER || "youcef";
    const validPass = process.env.ADMIN_PASSWORD || "strongpassword123";
    if (username !== validUser || password !== validPass) {
      return new Error("Unauthorized");
    }
  },
  authenticate: true // Prompts the browser for credentials
});

fastify.after(() => {
  fastify.addHook("onRequest", async (req, reply) => {
    // Protect all /admin routes
    if (req.raw.url.startsWith("/admin")) {
      await fastify.basicAuth(req, reply);
    }
  });
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

fastify.get("/admin/affiliate", async (request, reply) => {
  const { getRepository } = await import("./db/repository.js");
  const repository = await getRepository();
  if (!repository) return reply.type("text/html").send("<h1>DB unavailable</h1>");
  const settings = await repository.getAffiliateSettings();
  const { renderAffiliateSettingsHtml } = await import("./views/admin.js");
  reply.type("text/html; charset=utf-8").send(renderAffiliateSettingsHtml(settings));
});

// Save affiliate tag from admin form (POST)
fastify.post("/admin/affiliate", async (request, reply) => {
  const secret = request.headers["x-admin-secret"] ?? request.body?.secret;
  if (secret !== (process.env.ADMIN_EXPORT_SECRET ?? "majorlogic-admin")) {
    return reply.status(401).send({ error: "unauthorized" });
  }
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
  if (secret !== (process.env.ADMIN_EXPORT_SECRET ?? "majorlogic-admin")) {
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
      const amazonTag = tagMap["Amazon"]?.tag ?? "majorlogic-20";
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
