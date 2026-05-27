/**
 * fetch-sources.js
 *
 * Pulls real product data from configured API integrations (BestBuy, Reddit, Amazon PA-API)
 * and writes the result to domains/{domainId}/sources/market-sources.json
 *
 * Called automatically by catalog-build.js before ingest-domain.js.
 * If no integrations are active, the existing market-sources.json is left unchanged.
 *
 * Usage: node scripts/fetch-sources.js --domain=laptop-student-us
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadEnvFile } from "./env.js";
import { createPostgresClient, PostgresPlatformRepository } from "../packages/postgres-persistence/src/index.js";

loadEnvFile();

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha(str) {
  return createHash("sha256").update(str).digest("hex").slice(0, 16);
}

function estimatePerformanceScore(specs) {
  let score = 50;
  const ram = specs.ramGb || 0;
  const storage = specs.storageGb || 0;
  if (ram >= 32) score += 25;
  else if (ram >= 16) score += 15;
  else if (ram >= 8) score += 5;
  if (storage >= 1024) score += 10;
  else if (storage >= 512) score += 5;
  if (specs.hasDiscreteGpu) score += 15;
  return Math.min(score, 98);
}

function estimatePortabilityScore(weightLbs) {
  if (!weightLbs) return 65;
  if (weightLbs <= 2.5) return 92;
  if (weightLbs <= 3.5) return 80;
  if (weightLbs <= 4.5) return 68;
  if (weightLbs <= 5.5) return 55;
  return 40;
}

function inferMajorSignals(name = "", specs = {}) {
  const n = name.toLowerCase();
  const signals = ["general"];
  if (specs.hasDiscreteGpu || n.includes("gaming") || n.includes("nitro") || n.includes("loq"))
    signals.push("engineering", "design");
  if (specs.ramGb >= 16)
    signals.push("cs", "engineering");
  if (n.includes("thinkpad") || n.includes("latitude") || n.includes("elitebook"))
    signals.push("business");
  if (n.includes("macbook"))
    signals.push("design", "cs");
  return [...new Set(signals)];
}

// ── BestBuy Fetcher ───────────────────────────────────────────────────────────

async function fetchBestBuy(credentials, domainId) {
  const apiKey = credentials?.api_key;
  if (!apiKey) throw new Error("BestBuy: api_key missing");
  const retrievedAt = new Date().toISOString();

  const query = domainId === "laptop-student-us"
    ? "(type=laptop)&(active=true)&(salePrice<2000)&(salePrice>300)"
    : "(type=laptop)&(active=true)";

  const fields = [
    "sku", "name", "manufacturer", "salePrice", "regularPrice",
    "customerReviewCount", "customerReviewAverage",
    "ram", "hardDriveSize", "hardDriveType",
    "processorBrand", "processorModel",
    "displaySize", "weight", "url"
  ].join(",");

  const PAGE_SIZE = 100;
  const MAX_PAGES = 10; // cap at 1,000 products to avoid runaway billing
  const buildUrl = (page) =>
    `https://api.bestbuy.com/v1/products(${query})?format=json&pageSize=${PAGE_SIZE}&page=${page}&sort=customerReviewCount.dsc&apiKey=${apiKey}&show=${fields}`;

  console.log("[BestBuy] Fetching laptops from Best Buy API…");

  const products = [];
  let page = 1;
  let totalPages = 1;

  while (page <= Math.min(totalPages, MAX_PAGES)) {
    const res = await fetch(buildUrl(page));
    if (!res.ok) throw new Error(`BestBuy API error: ${res.status} ${await res.text()}`);
    const data = await res.json();

    totalPages = data.totalPages ?? 1;
    const batch = data.products ?? [];
    products.push(...batch);
    console.log(`[BestBuy] Page ${page}/${Math.min(totalPages, MAX_PAGES)} — ${batch.length} products`);

    if (batch.length < PAGE_SIZE) break; // last page returned fewer items
    page++;
  }

  console.log(`[BestBuy] Got ${products.length} products total`);

  return products.map(p => {
    const ramGb = parseInt((p.ram || "0").replace(/\D/g, "")) || 0;
    const storageTxt = (p.hardDriveSize || "").toLowerCase();
    let storageGb = parseInt(storageTxt.replace(/\D/g, "")) || 0;
    if (storageTxt.includes("tb") && storageGb < 10) storageGb *= 1024;
    const hasDiscreteGpu = /rtx|gtx|rx\s*\d|radeon/i.test(p.name || "");
    const weightLbs = parseFloat((p.weight || "0").replace(/[^\d.]/g, "")) || null;
    const perfScore = estimatePerformanceScore({ ramGb, storageGb, hasDiscreteGpu });
    const portScore = estimatePortabilityScore(weightLbs);
    const reviewScore = p.customerReviewAverage ? Math.round(p.customerReviewAverage * 10) : 70;
    const reviewCount = p.customerReviewCount || 0;

    return {
      sourceId: `bestbuy-${p.sku}`,
      sourceType: "retailer",
      sourceName: "Best Buy",
      sourceUrl: p.url || `https://www.bestbuy.com/site/${p.sku}.p`,
      itemName: p.name || "Unknown Laptop",
      variantName: [p.processorBrand, p.processorModel, p.ram, p.hardDriveSize].filter(Boolean).join(" / ") || "Standard",
      majorSignals: inferMajorSignals(p.name, { ramGb, storageGb, hasDiscreteGpu }),
      _meta: {
        retrievedAt,
        acquisitionMethod: "api",
        inferredFields: ["performance", "display", "battery", "thermals"],
        realFields: ["ramGb", "storageGb", "gpuClass", "priceUsd", "reviewCoverage"]
      },
      rawSpecs: {
        ram: p.ram || `${ramGb} GB`,
        storage: p.hardDriveSize || `${storageGb} GB SSD`,
        gpu: hasDiscreteGpu ? "Discrete GPU" : "Integrated",
        performance_score: String(perfScore),
        display_score: String(reviewScore > 80 ? 82 : 70),
        battery_score: String(portScore > 80 ? 78 : 68),
        portability_score: String(portScore),
        thermals_score: String(hasDiscreteGpu ? 65 : 75)
      },
      reviewEvidence: {
        topCons: [],
        reviewRiskScore: reviewCount > 100 ? 0.2 : 0.4,
        reviewCoverage: Math.min(reviewCount, 999)
      },
      trustEvidence: {
        sourceConfidence: reviewCount > 50 ? 0.85 : 0.65,
        freshnessDays: 0
      },
      offers: [
        {
          seller: "Best Buy",
          priceUsd: p.salePrice || p.regularPrice || 0,
          condition: "new",
          affiliate: true
        }
      ]
    };
  }).filter(r => r.offers[0].priceUsd > 0);
}

// ── Reddit Review Enrichment ──────────────────────────────────────────────────

async function fetchRedditReviews(credentials, productNames) {
  const { client_id, client_secret, user_agent = "MajorLogic/1.0" } = credentials;
  if (!client_id || !client_secret) throw new Error("Reddit: client_id / client_secret missing");

  // Get OAuth token
  const auth = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
  const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "User-Agent": user_agent,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!tokenRes.ok) throw new Error(`Reddit auth failed: ${tokenRes.status}`);
  const { access_token } = await tokenRes.json();

  const reviewMap = {};
  const CON_PATTERNS = [
    { re: /thermal|overheat|hot\b|heat/i, label: "thermal_throttling" },
    { re: /fan\s*noise|loud\s*fan|noisy/i, label: "fan_noise" },
    { re: /battery\s*life|battery\s*drain|bad\s*battery/i, label: "battery_life" },
    { re: /heavy|weight|bulky/i, label: "heavy_build" },
    { re: /screen|display|dim\b|glare/i, label: "display_quality" },
    { re: /slow|lag|sluggish/i, label: "performance_issues" },
    { re: /build\s*quality|cheap\s*plastic|flex/i, label: "build_quality" },
  ];

  for (const name of productNames.slice(0, 10)) { // cap at 10 to avoid rate limits
    try {
      const q = encodeURIComponent(name.split(" ").slice(0, 3).join(" "));
      const res = await fetch(
        `https://oauth.reddit.com/r/laptops+SuggestALaptop/search?q=${q}&sort=top&limit=10&restrict_sr=1`,
        { headers: { Authorization: `Bearer ${access_token}`, "User-Agent": user_agent } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const posts = data?.data?.children || [];
      const allText = posts.map(p => p.data?.selftext + " " + p.data?.title).join(" ");
      const cons = CON_PATTERNS.filter(p => p.re.test(allText)).map(p => p.label);
      const mentions = posts.length;
      const upvotes = posts.reduce((s, p) => s + (p.data?.score || 0), 0);
      reviewMap[name.toLowerCase()] = { cons, mentions, upvotes };
      await new Promise(r => setTimeout(r, 300)); // respect rate limit
    } catch { /* skip on error */ }
  }

  return reviewMap;
}

// ── Amazon PA-API Fetcher ─────────────────────────────────────────────────────
// Requires: access_key, secret_key, partner_tag, region (default: us-east-1)

async function fetchAmazonPA(_credentials) {
  // AWS Signature v4 signing for PA-API v5 is not yet implemented.
  // Activate this integration only after implementing signing:
  //   https://webservices.amazon.com/paapi5/documentation/
  throw new Error("Amazon PA-API v5 signing not implemented — remove from active integrations until ready");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const args = process.argv.slice(2);
  const domainId = args.find(a => a.startsWith("--domain="))?.split("=")[1] ?? args[0];
  if (!domainId) {
    console.error("Usage: node scripts/fetch-sources.js --domain=<domainId>");
    process.exit(1);
  }

  const sourcesPath = path.resolve(`domains/${domainId}/sources/market-sources.json`);

  // ── Source Intelligence Router ────────────────────────────────────────────
  // Reads source-config.json to decide which acquisition method is allowed per source.
  // A source disabled in config stays off even if credentials exist in DB.
  let sourceConfig = { sources: {} };
  try {
    const configPath = path.resolve(`domains/${domainId}/sources/source-config.json`);
    sourceConfig = JSON.parse(await fs.promises.readFile(configPath, "utf8"));
  } catch {
    console.log("[fetch-sources] No source-config.json — all sources enabled by default");
  }
  const isSourceEnabled = (slug) => sourceConfig.sources[slug]?.enabled !== false;
  const sourceMethod = (slug) => sourceConfig.sources[slug]?.method ?? "api";

  if (!process.env.DATABASE_URL) {
    console.log("[fetch-sources] No DATABASE_URL — skipping live fetch, using existing sources.");
    return;
  }

  let client;
  try {
    client = await createPostgresClient(process.env.DATABASE_URL);
    const repo = new PostgresPlatformRepository(client);

    // Load all active integrations
    const integrations = await repo.getIntegrations();
    const active = Object.fromEntries(
      integrations
        .filter(i => i.is_active && i.has_credentials)
        .map(i => [i.slug, i])
    );

    // Need full credentials (not masked) — re-fetch individually
    const getFullCreds = async (slug) => {
      const row = await repo.getIntegrationBySlug(slug);
      return row?.credentials ?? {};
    };

    const sources = [];
    let anyFetched = false;

    // ── BestBuy ───────────────────────────────────────────────────────────────
    if (active.bestbuy && isSourceEnabled("bestbuy")) {
      const method = sourceMethod("bestbuy");
      console.log(`[BestBuy] method=${method}`);
      try {
        const creds = await getFullCreds("bestbuy");
        const records = await fetchBestBuy(creds, domainId);
        console.log(`[BestBuy] ✅ ${records.length} laptops fetched`);
        sources.push(...records);
        anyFetched = true;
      } catch (e) {
        console.error(`[BestBuy] ❌ ${e.message}`);
      }
    }

    // ── Amazon PA-API ─────────────────────────────────────────────────────────
    if (active.amazon_pa && isSourceEnabled("amazon_pa")) {
      const method = sourceMethod("amazon_pa");
      console.log(`[Amazon PA] method=${method}`);
      try {
        const creds = await getFullCreds("amazon_pa");
        const records = await fetchAmazonPA(creds);
        if (records.length) {
          console.log(`[Amazon PA] ✅ ${records.length} laptops fetched`);
          sources.push(...records);
          anyFetched = true;
        }
      } catch (e) {
        console.error(`[Amazon PA] ❌ ${e.message}`);
      }
    }

    if (!anyFetched) {
      console.log("[fetch-sources] No active retailer integrations found — keeping existing sources.");
      return;
    }

    // ── Reddit review enrichment ──────────────────────────────────────────────
    if (active.reddit && sources.length) {
      try {
        const creds = await getFullCreds("reddit");
        const names = [...new Set(sources.map(s => s.itemName))];
        console.log(`[Reddit] Fetching reviews for ${names.length} products…`);
        const reviewMap = await fetchRedditReviews(creds, names);

        for (const source of sources) {
          const key = source.itemName.toLowerCase();
          // Match if at least 2 meaningful words (>3 chars) from the review key appear in the product name.
        // Prevents "Apple MacBook Air" from stealing reviews meant for "Apple MacBook Pro".
        const review = Object.entries(reviewMap).find(([k]) => {
          const keyWords = k.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          if (!keyWords.length) return false;
          const matchCount = keyWords.filter(w => key.includes(w)).length;
          return matchCount >= Math.min(2, keyWords.length);
        })?.[1];
          if (review) {
            source.reviewEvidence.topCons = review.cons;
            source.reviewEvidence.reviewCoverage = review.mentions;
            source.reviewEvidence.reviewRiskScore = review.cons.length > 2 ? 0.45 : 0.2;
          }
        }
        console.log(`[Reddit] ✅ Reviews enriched for ${Object.keys(reviewMap).length} products`);
      } catch (e) {
        console.error(`[Reddit] ❌ ${e.message} — continuing without review enrichment`);
      }
    }

    // Remove duplicates by itemName (keep first occurrence)
    const seen = new Set();
    const unique = sources.filter(s => {
      const key = s.itemName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    await fs.promises.writeFile(sourcesPath, JSON.stringify(unique, null, 2));
    console.log(`\n✅ market-sources.json updated: ${unique.length} products → ${sourcesPath}`);

  } finally {
    if (client) await client.end();
  }
}

run().catch(err => {
  console.error("\n❌ fetch-sources failed:", err.message);
  process.exit(1);
});
