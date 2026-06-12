import path from "node:path";
import fs from "node:fs";
import { renderSearchPage } from "../views/templates.js";
import { renderResultsPage } from "../views/results-page.js";
import { renderPrivacyPolicy, renderTermsOfUse, renderDisclosure, renderOurStory, renderHowWeWork } from "../views/legal.js";
import { getUsersRepository } from "../db/repository.js";
import { getPublicBaseUrl } from "../config/validate-env.js";
import seoRoutes from "./web/seo.js";

// Cache the generated catalog in memory to avoid repeated file reads
let _catalogCache = null;
let _catalogCachePath = null;
let _catalogCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function loadCatalogFile(filePath) {
  const now = Date.now();
  if (_catalogCachePath === filePath && _catalogCache && (now - _catalogCacheTime < CACHE_TTL_MS)) {
    return _catalogCache;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    _catalogCache = Array.isArray(raw) ? raw : Object.values(raw);
    _catalogCachePath = filePath;
    _catalogCacheTime = now;
  } catch { _catalogCache = []; }
  return _catalogCache;
}

export default async function webRoutes(fastify, { root, port, FRONTEND_URL, DEFAULT_DOMAIN, defaultProfile }) {

  // ── Robots & Sitemap ──────────────────────────────────────────────────────

  fastify.get("/robots.txt", async (_request, reply) => {
    const base = getPublicBaseUrl();
    reply.type("text/plain").send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${base}/sitemap.xml`
    );
  });

  fastify.get("/sitemap.xml", async (_request, reply) => {
    const base = getPublicBaseUrl();
    const indexPath = path.join(root, "domains/laptop-student-us/generated/seo-pages/_index.json");
    if (!fs.existsSync(indexPath)) {
      return reply.status(404).send("Sitemap not generated yet. Run generate-seo-pages.");
    }
    const { pages = [] } = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    const urls = [
      `  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      `  <url><loc>${base}/search</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`,
      ...pages.map(p => {
        const lastmod = p.generatedAt ? `<lastmod>${p.generatedAt.slice(0, 10)}</lastmod>` : "";
        return `  <url><loc>${base}${p.canonical}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.8</priority></url>`;
      })
    ].join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    reply.type("application/xml").send(xml);
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
  fastify.get("/our-story", async (_request, reply) => {
    reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
    reply.type("text/html; charset=utf-8").send(renderOurStory());
  });
  fastify.get("/how-we-work", async (_request, reply) => {
    reply.type("text/html; charset=utf-8").send(renderHowWeWork());
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

  // ── Shared Decision Links ─────────────────────────────────────────────────

  fastify.get("/share/:token", async (request, reply) => {
    const { token } = request.params;

    // Reject tokens that don't look like 64-char hex
    if (!/^[0-9a-f]{64}$/.test(token)) {
      return reply.status(404).type("text/html").send(renderSharedLinkNotFound());
    }

    const repo = await getUsersRepository();
    if (!repo) {
      return reply.status(503).type("text/html").send("<html><body>Service unavailable</body></html>");
    }

    const link = await repo.getSharedLinkByToken(token);
    if (!link) {
      return reply.status(404).type("text/html").send(renderSharedLinkNotFound());
    }

    reply.type("text/html; charset=utf-8").send(renderSharedDecisionPage(link));
  });

  fastify.register(seoRoutes, { root });
}

// ── Shared link page renderers ────────────────────────────────────────────────

function escapeHtmlStr(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderSharedLinkNotFound() {
  return `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8"/>
  <title>Link Not Found — MajorLogic</title>
  <meta name="robots" content="noindex"/>
  <style>body{font-family:system-ui,sans-serif;background:#0d0d1a;color:#e0e0e0;max-width:600px;margin:0 auto;padding:48px 20px;text-align:center;}
  h1{color:#fff;} a{color:#7C3AED;}</style>
</head><body>
  <h1>🔗 Link Not Found</h1>
  <p>This shared decision link has expired, been revoked, or doesn't exist.</p>
  <a href="/search">← Get your own personalized recommendation</a>
</body></html>`;
}

function renderSharedDecisionPage(link) {
  const title    = escapeHtmlStr(link.title);
  const domain   = escapeHtmlStr(link.domain);
  const irHash   = link.ir_hash ? escapeHtmlStr(link.ir_hash.slice(0, 12)) : null;
  const snap     = link.snapshot || {};
  const topName  = escapeHtmlStr(snap.name || snap.topChoice || "");
  const topScore = snap.score != null ? Number(snap.score) : null;
  const whyText  = escapeHtmlStr(snap.whyChosen || snap.summary || "");
  const expires  = new Date(link.expires_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const scoreHtml = topScore != null
    ? `<div style="font-size:48px;font-weight:800;color:#7C3AED;line-height:1;">${topScore}%</div>
       <div style="font-size:13px;color:#9ca3af;margin-top:4px;">Match Score</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8"/>
  <title>${title} — Shared Decision · MajorLogic</title>
  <meta name="robots" content="noindex"/>
  <meta name="description" content="View a shared laptop decision from MajorLogic AI."/>
  <style>
    *{box-sizing:border-box;}
    body{font-family:system-ui,sans-serif;background:#0d0d1a;color:#e0e0e0;max-width:680px;margin:0 auto;padding:32px 20px;}
    h1{color:#fff;font-size:22px;margin:0 0 4px;}
    .card{background:#111827;border:1px solid #1f2937;border-radius:14px;padding:24px;margin-top:16px;}
    .badge{display:inline-block;background:rgba(124,58,237,.15);color:#a78bfa;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;margin-bottom:12px;}
    .why{font-size:14px;color:#d1d5db;line-height:1.7;margin-top:12px;}
    .meta{font-size:11px;color:#6b7280;margin-top:16px;border-top:1px solid #1f2937;padding-top:12px;}
    .cta{display:inline-block;margin-top:24px;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;}
    a{color:#7C3AED;}
  </style>
</head><body>
  <a href="/search" style="font-size:13px;color:#9ca3af;">← MajorLogic</a>
  <div style="margin-top:20px;">
    <div class="badge">📎 Shared Decision</div>
    <h1>${title}</h1>
    <p style="color:#9ca3af;font-size:13px;margin:4px 0 0;">Domain: ${domain}</p>
  </div>

  <div class="card">
    ${topName ? `<div style="font-size:18px;font-weight:700;color:#fff;margin-bottom:8px;">${topName}</div>` : ""}
    ${scoreHtml}
    ${whyText ? `<div class="why">${whyText}</div>` : ""}
    <div class="meta">
      ${irHash ? `<span>Decision integrity hash: <code>${irHash}…</code></span> · ` : ""}
      Link expires ${expires}
    </div>
  </div>

  <a class="cta" href="/search">🎯 Get your own recommendation</a>
  <p style="margin-top:16px;font-size:12px;color:#6b7280;">
    This is a read-only snapshot. Rankings are algorithm-generated; affiliate links never affect rankings.
    <a href="/disclosure">How we stay honest →</a>
  </p>
</body></html>`;
}
