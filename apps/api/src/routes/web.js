import path from "node:path";
import fs from "node:fs";
import { renderSearchPage, renderResultsPage } from "../views/templates.js";
import { renderPrivacyPolicy, renderTermsOfUse, renderDisclosure } from "../views/legal.js";
import { renderSeoPage } from "../views/seo-page.js";

// Cache the generated catalog in memory to avoid repeated file reads
let _catalogCache = null;
let _catalogCachePath = null;
function loadCatalogFile(filePath) {
  if (_catalogCachePath === filePath && _catalogCache) return _catalogCache;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    _catalogCache = Array.isArray(raw) ? raw : Object.values(raw);
    _catalogCachePath = filePath;
  } catch { _catalogCache = []; }
  return _catalogCache;
}

export default async function webRoutes(fastify, { root, port, FRONTEND_URL, DEFAULT_DOMAIN, defaultProfile }) {

  // ── Robots & Sitemap ──────────────────────────────────────────────────────

  fastify.get("/robots.txt", async (_request, reply) => {
    reply.type("text/plain").send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: https://majorlogic.ai/sitemap.xml`
    );
  });

  fastify.get("/sitemap.xml", async (_request, reply) => {
    const sitemapPath = path.join(root, "apps/api/public/sitemap.xml");
    if (!fs.existsSync(sitemapPath)) {
      return reply.status(404).send("Sitemap not generated yet. Run catalog-build.");
    }
    reply.type("application/xml").send(fs.readFileSync(sitemapPath, "utf8"));
  });

  // ── SPA Redirects ─────────────────────────────────────────────────────────

  fastify.get("/", async (request, reply) => {
    const host = request.headers.host || '';
    if (host.startsWith('admin.')) return reply.redirect('/admin/login', 302);
    return reply.redirect(FRONTEND_URL, 302);
  });
  fastify.get("/search", async (_request, reply) => reply.redirect(FRONTEND_URL, 302));
  fastify.get("/results", async (request, reply) => {
    const url = new URL(request.raw.url, FRONTEND_URL);
    reply.redirect(url.toString(), 302);
  });

  // ── Legal Pages ───────────────────────────────────────────────────────────

  fastify.get("/privacy", async (_request, reply) => {
    reply.type("text/html; charset=utf-8").send(renderPrivacyPolicy());
  });
  fastify.get("/terms", async (_request, reply) => {
    reply.type("text/html; charset=utf-8").send(renderTermsOfUse());
  });
  fastify.get("/disclosure", async (_request, reply) => {
    reply.type("text/html; charset=utf-8").send(renderDisclosure());
  });
  fastify.get("/how-we-work", async (_request, reply) => {
    reply.redirect("/disclosure", 301);
  });

  // ── SSR Web Routes ────────────────────────────────────────────────────────

  fastify.get("/web/search", async (request, reply) => {
    const { getDomainController } = await import("../registry.js");
    const controller = getDomainController(DEFAULT_DOMAIN);
    const proto = request.headers["x-forwarded-proto"] ?? "http";
    const host = request.headers.host ?? `localhost:${port}`;
    const url = new URL(request.raw.url, `${proto}://${host}`);
    const state = controller.buildSearchState(url.searchParams, defaultProfile);
    reply.type("text/html; charset=utf-8").send(renderSearchPage(state));
  });

  fastify.get("/web/results", async (request, reply) => {
    const { getDomainController } = await import("../registry.js");
    const controller = getDomainController(DEFAULT_DOMAIN);
    const proto = request.headers["x-forwarded-proto"] ?? "http";
    const host = request.headers.host ?? `localhost:${port}`;
    const url = new URL(request.raw.url, `${proto}://${host}`);
    const state = controller.buildSearchState(url.searchParams, defaultProfile);
    const result = await controller.runPipeline(state.profile);
    reply.type("text/html; charset=utf-8").send(renderResultsPage({ state, result, requestUrl: url.toString() }));
  });

  // ── Ethical Affiliate Gateway ─────────────────────────────────────────────

  fastify.get("/go/:domain/:entityId", async (request, reply) => {
    const { domain, entityId } = request.params;
    const { seller = "" } = request.query;

    const DEFAULT_TAG = process.env.DEFAULT_AFFILIATE_TAG ?? "majorlogic-20";

    try {
      // Always read from the generated file (source of truth) — avoids stale DB entities
      const catalogPath = path.join(root, `domains/${domain}/generated/published-catalog.generated.json`);
      const catalogEntities = loadCatalogFile(catalogPath);
      const entity = catalogEntities.find(e => e.entityId === entityId);

      if (entity) {
        // Try direct affiliateUrl from bestOffer or offers list
        const offers = entity.market?.offers || [];
        const bestOfferUrl = entity.market?.bestOffer?.affiliateUrl;
        const targetOffer = seller
          ? offers.find(o => o.seller === seller)
          : offers.sort((a, b) => (a.priceUsd || 0) - (b.priceUsd || 0))[0];

        const rawUrl = targetOffer?.affiliateUrl || bestOfferUrl || null;
        // security: only redirect to known affiliate domains (SSRF prevention)
      const AFFILIATE_HOSTS = new Set([
        "www.amazon.com", "amazon.com", "amzn.to",
        "www.ebay.com", "ebay.com",
        "www.bestbuy.com", "bestbuy.com",
        "www.walmart.com", "walmart.com",
      ]);
      if (rawUrl) {
          try {
            const parsed = new URL(rawUrl);
            if (parsed.protocol === "https:" && AFFILIATE_HOSTS.has(parsed.hostname)) {
              // Log click asynchronously — non-blocking
              const { getRepository } = await import("../db/repository.js");
              const repo = await getRepository();
              if (repo) repo.logAffiliateClick({
                domainId: domain, entityId,
                seller: targetOffer?.seller || "Amazon",
                priceUsd: targetOffer?.priceUsd || entity.market?.bestOffer?.priceUsd,
                isAffiliate: true
              }).catch(() => {});
              return reply.redirect(rawUrl, 302);
            }
          } catch { /* invalid URL — fall through */ }
        }

        // No direct URL — build clean Amazon search using real product title
        const searchQuery = entity.title || entity.itemName || entityId;
        return reply.redirect(
          `https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}&tag=${DEFAULT_TAG}`,
          302
        );
      }

      // Entity not in catalog — last resort fallback
      return reply.redirect(
        `https://www.amazon.com/s?k=${encodeURIComponent(entityId.replace(/-/g, " "))}&tag=${DEFAULT_TAG}`,
        302
      );
    } catch (err) {
      request.log.error({ err }, "[AffiliateGateway] Error");
      const fallbackTag = process.env.DEFAULT_AFFILIATE_TAG ?? "majorlogic-20";
      return reply.redirect(`https://www.amazon.com/s?k=${encodeURIComponent(entityId)}&tag=${fallbackTag}`, 302);
    }
  });

  // ── SEO Landing Pages ─────────────────────────────────────────────────────

  const SEO_PAGES_DIR = path.join(root, "domains/laptop-student-us/generated/seo-pages");

  const SAFE_SLUG = /^[a-z0-9-]{1,80}$/;

  function loadSeoPage(major, budget = "any-budget") {
    if (!SAFE_SLUG.test(major) || !SAFE_SLUG.test(budget)) return null;
    const filePath = path.resolve(SEO_PAGES_DIR, `${major}__${budget}.json`);
    // security: path.relative() correctly detects traversal on both Linux and Windows
    const rel = path.relative(path.resolve(SEO_PAGES_DIR), filePath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
    catch { return null; }
  }

  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  fastify.get("/laptops", async (_request, reply) => {
    const indexPath = path.join(SEO_PAGES_DIR, "_index.json");
    let pages = [];
    if (fs.existsSync(indexPath)) {
      try { pages = JSON.parse(fs.readFileSync(indexPath, "utf8")).pages ?? []; } catch { /* invalid JSON — use empty list */ }
    }
    const links = pages.map(p =>
      `<li><a href="${escapeHtml(p.canonical)}" style="color:#7C3AED;text-decoration:none;">${escapeHtml(p.h1)}</a></li>`
    ).join("");

    reply.type("text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8"/>
  <title>Laptop Guides by Major — MajorLogic</title>
  <meta name="description" content="Find the best laptop for your college major."/>
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

  fastify.get("/laptops/:major", async (request, reply) => {
    const { major } = request.params;
    const pageData = loadSeoPage(major, "any-budget");
    if (!pageData) {
      return reply.status(404).type("text/html").send(`
        <html><body style="font-family:sans-serif;background:#0d0d1a;color:#e0e0e0;padding:32px;text-align:center;">
          <h1>🔍 Generating results for "${escapeHtml(major)}"...</h1>
          <p>Run <code>node scripts/catalog-build.js --domain=laptop-student-us</code> to generate SEO pages.</p>
          <a href="/search" style="color:#7C3AED;">← Use the interactive tool instead</a>
        </body></html>`);
    }
    reply.type("text/html; charset=utf-8").send(renderSeoPage(pageData));
  });

  fastify.get("/laptops/:major/:budget", async (request, reply) => {
    const { major, budget } = request.params;
    const pageData = loadSeoPage(major, budget);
    if (!pageData) return reply.redirect(`/laptops/${major}`, 302);
    reply.type("text/html; charset=utf-8").send(renderSeoPage(pageData));
  });
}
