import path from "node:path";
import fs from "node:fs";
import { renderSeoPage } from "../../views/seo-page.js";

const SAFE_SLUG = /^[a-z0-9-]{1,80}$/;

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export default async function seoRoutes(fastify, { root }) {
  const SEO_PAGES_DIR = path.join(root, "domains/laptop-student-us/generated/seo-pages");

  function loadSeoPage(major, budget = "any-budget") {
    if (!SAFE_SLUG.test(major) || !SAFE_SLUG.test(budget)) return null;
    const filePath = path.resolve(SEO_PAGES_DIR, `${major}__${budget}.json`);
    const rel = path.relative(path.resolve(SEO_PAGES_DIR), filePath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
    catch { return null; }
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
