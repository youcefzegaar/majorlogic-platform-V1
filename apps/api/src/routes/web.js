import path from "node:path";
import fs from "node:fs";
import { renderSearchPage, renderResultsPage } from "../views/templates.js";
import { renderPrivacyPolicy, renderTermsOfUse, renderDisclosure } from "../views/legal.js";
import { renderSeoPage } from "../views/seo-page.js";

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

  fastify.get("/", async (_request, reply) => reply.redirect(FRONTEND_URL));
  fastify.get("/search", async (_request, reply) => reply.redirect(FRONTEND_URL));
  fastify.get("/results", async (request, reply) => {
    const url = new URL(request.raw.url, FRONTEND_URL);
    reply.redirect(url.toString());
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

    try {
      const { getRepository } = await import("../db/repository.js");
      const repository = await getRepository();

      let affiliateUrl = null;

      if (repository) {
        const affiliateTagMap = await repository.getAffiliateTagMap();
        const entities = await repository.getPublishedEntities({ domainId: domain, limit: 500 });
        const entity = entities.find(e => e.entityId === entityId || e.title === entityId);

        if (entity) {
          const offers = entity.market?.offers || [];
          const targetOffer = seller
            ? offers.find(o => o.seller === seller)
            : offers.sort((a, b) => a.priceUsd - b.priceUsd)[0];

          if (targetOffer) {
            const rawUrl = targetOffer.affiliateUrl || null;
            if (rawUrl) {
              try {
                const parsed = new URL(rawUrl);
                affiliateUrl = parsed.protocol === "https:" ? rawUrl : null;
              } catch {
                affiliateUrl = null;
              }
            }

            if (affiliateUrl && affiliateTagMap[targetOffer.seller]) {
              const { tag, paramKey } = affiliateTagMap[targetOffer.seller];
              try {
                const url = new URL(affiliateUrl);
                url.searchParams.set(paramKey, tag);
                affiliateUrl = url.toString();
              } catch {
                affiliateUrl = null;
              }
            }

            repository.logAffiliateClick({
              domainId: domain, entityId,
              seller: targetOffer.seller,
              sellerType: targetOffer.sellerType,
              priceUsd: targetOffer.priceUsd,
              condition: targetOffer.condition,
              isAffiliate: targetOffer.affiliate
            }).catch(err => request.log.error({ err }, "[AffiliateGateway] Click log failed"));
          }
        }

        if (!affiliateUrl) {
          const amazonTag = affiliateTagMap["Amazon"]?.tag ?? process.env.DEFAULT_AFFILIATE_TAG ?? "majorlogic-20";
          affiliateUrl = `https://www.amazon.com/s?k=${encodeURIComponent(entityId)}&tag=${amazonTag}`;
        }
      } else {
        const fallbackTag = process.env.DEFAULT_AFFILIATE_TAG ?? "majorlogic-20";
        affiliateUrl = `https://www.amazon.com/s?k=${encodeURIComponent(entityId)}&tag=${fallbackTag}`;
      }

      return reply.redirect(302, affiliateUrl);
    } catch (err) {
      request.log.error({ err }, "[AffiliateGateway] Error");
      const fallbackTag = process.env.DEFAULT_AFFILIATE_TAG ?? "majorlogic-20";
      return reply.redirect(302, `https://www.amazon.com/s?k=${encodeURIComponent(entityId)}&tag=${fallbackTag}`);
    }
  });

  // ── SEO Landing Pages ─────────────────────────────────────────────────────

  const SEO_PAGES_DIR = path.join(root, "domains/laptop-student-us/generated/seo-pages");

  const SAFE_SLUG = /^[a-z0-9-]{1,80}$/;

  function loadSeoPage(major, budget = "any-budget") {
    if (!SAFE_SLUG.test(major) || !SAFE_SLUG.test(budget)) return null;
    const filePath = path.resolve(SEO_PAGES_DIR, `${major}__${budget}.json`);
    if (!filePath.startsWith(path.resolve(SEO_PAGES_DIR) + path.sep)) return null;
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
      try { pages = JSON.parse(fs.readFileSync(indexPath, "utf8")).pages ?? []; } catch {}
    }
    const links = pages.map(p =>
      `<li><a href="${p.canonical}" style="color:#7C3AED;text-decoration:none;">${escapeHtml(p.h1)}</a></li>`
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
    if (!pageData) return reply.redirect(302, `/laptops/${major}`);
    reply.type("text/html; charset=utf-8").send(renderSeoPage(pageData));
  });
}
