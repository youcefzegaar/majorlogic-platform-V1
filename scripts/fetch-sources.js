/**
 * fetch-sources.js
 *
 * Pulls real product data from configured sources and writes the result to
 * domains/{domainId}/sources/market-sources.json
 *
 * Source priority (cheapest → most expensive):
 *   1. Parser workers  — NotebookCheck, Newegg   (free, no DB needed)
 *   2. Rainforest API  — Amazon data via env var  (free tier, no DB needed)
 *   3. API integrations via DB — BestBuy, Reddit  (requires DATABASE_URL)
 *
 * Usage: node scripts/fetch-sources.js --domain=laptop-student-us
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { loadEnvFile } from "./env.js";
import { createPostgresClient, PostgresPlatformRepository } from "../packages/postgres-persistence/src/index.js";

loadEnvFile();

// ── Worker dispatcher ─────────────────────────────────────────────────────────

function runWorker(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    proc.stdout.on("data", d => { out += d; });
    proc.stderr.on("data", d => { err += d; process.stderr.write(d); });
    proc.on("close", code => {
      if (code === 0) resolve(out);
      else reject(new Error(`Worker exited ${code}: ${err.slice(-300)}`));
    });
    proc.on("error", reject);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function parseSpecsFromTitle(title) {
  const t = title || "";
  const ramMatch = t.match(/(\d+)\s*GB\s*(?:RAM|Memory|LPDDR|DDR)/i)
    || t.match(/(\d+)GB(?=\s*[,\s])/);
  const ramGb = ramMatch ? parseInt(ramMatch[1]) : 0;

  const tbMatch = t.match(/(\d+(?:\.\d+)?)\s*TB/i);
  const gbMatch = t.match(/(\d+)\s*GB\s*(?:SSD|HDD|NVMe|Storage)/i);
  const storageGb = tbMatch
    ? Math.round(parseFloat(tbMatch[1]) * 1024)
    : gbMatch ? parseInt(gbMatch[1]) : 0;

  const hasDiscreteGpu = /RTX\s*\d|GTX\s*\d|RX\s*\d{4}|Radeon\s*RX|Arc\s*[AB]\d/i.test(t);

  return { ramGb, storageGb, hasDiscreteGpu };
}

// ── TechSpecs API — Real Spec Enrichment ─────────────────────────────────────
// Provides real hardware specs (weight, display, battery, RAM, CPU, GPU).
// Free tier, no credit card. Register at techspecs.io → Profile → API Keys.
// Reads TECHSPECS_API_KEY from environment.

const TECHSPECS_BASE = "https://api.techspecs.io/v5";

// Kept at 5 terms — TechSpecs free tier has ~10 req/day quota.
// Search (5) + Details (20) = 25 calls total — stays within free limits.
const LAPTOP_SEARCH_TERMS = [
  "MacBook Air",
  "ThinkPad laptop",
  "Dell XPS laptop",
  "ASUS ZenBook",
  "HP Spectre",
];

async function fetchTechSpecs() {
  const apiKey = process.env.TECHSPECS_API_KEY;
  const apiId  = process.env.TECHSPECS_API_ID;
  if (!apiKey) throw new Error("TECHSPECS_API_KEY not set");

  // v5 uses GET + X-API-KEY + X-API-ID headers
  const headers = {
    "accept":    "application/json",
    "X-API-KEY": apiKey,
    ...(apiId ? { "X-API-ID": apiId } : {}),
  };

  const parseNum = (v) => parseFloat(String(v ?? "").replace(/[^\d.]/g, "")) || 0;

  const retrievedAt = new Date().toISOString();
  const seen = new Set();
  const productIds = [];

  // Step 1: collect product IDs from search (each term returns 20 results)
  for (const term of LAPTOP_SEARCH_TERMS) {
    try {
      const res = await fetch(
        `${TECHSPECS_BASE}/products/search?query=${encodeURIComponent(term)}`,
        { method: "GET", headers }
      );
      if (!res.ok) { console.error(`[TechSpecs] ❌ "${term}": HTTP ${res.status}`); continue; }

      const data = await res.json();
      const items = Array.isArray(data.data) ? data.data : [];

      for (const item of items) {
        const id = item.Product?.id ?? item._id ?? item.id;
        const cat = (item.Product?.Category ?? "").toLowerCase();
        if (!id || seen.has(id)) continue;
        if (cat && !cat.includes("laptop") && !cat.includes("notebook")) continue;
        seen.add(id);
        productIds.push({ id, brand: item.Product?.Brand ?? "", model: item.Product?.Model ?? "" });
      }

      console.log(`[TechSpecs] "${term}" → ${items.length} results (${productIds.length} IDs)`);
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`[TechSpecs] ⚠️  "${term}": ${e.message}`);
    }
  }

  // Step 2: fetch details for top 30 unique products
  const results = [];
  for (const { id, brand, model } of productIds.slice(0, 30)) {
    try {
      const res = await fetch(`${TECHSPECS_BASE}/products/${id}`, { method: "GET", headers });
      if (!res.ok) continue;

      const d = (await res.json()).data ?? {};
      const inside  = d.Inside  ?? {};
      const display = d.Display ?? {};


      const ramGb = parseNum(inside.RAM?.Capacity ?? inside["Key Aspects"]?.RAM ?? d["Key Aspects"]?.RAM ?? "0");
      const storageRaw = String(inside.Storage?.["Total Capacity"] ?? d["Key Aspects"]?.Storage ?? "0");
      const storageGb = /tb/i.test(storageRaw)
        ? Math.round(parseNum(storageRaw) * 1024)
        : parseNum(storageRaw);

      const cpuName   = [inside.CPU?.Series, inside.CPU?.Frequency].filter(Boolean).join(" ").trim();
      const gpuModel  = inside.GPU?.Model ?? "";
      const gpuType   = (inside.GPU?.Type ?? "").toLowerCase();
      const hasDiscrete = gpuType === "dedicated" || /rtx|gtx|rx\s*\d|radeon\s+rx/i.test(gpuModel);

      const displayIn = parseNum(display.Diagonal ?? "0");
      const itemName  = brand && model ? `${brand} ${model}` : model || brand || "Unknown Laptop";

      if (!ramGb && !storageGb) continue; // skip if no useful specs

      const perfScore = ramGb >= 32 ? 88 : ramGb >= 16 ? 76 : ramGb >= 8 ? 61 : 50;

      results.push({
        sourceId:    `techspecs-${id}`,
        sourceType:  "specs_db",
        sourceName:  "TechSpecs",
        sourceUrl:   `https://techspecs.io/products/${id}`,
        itemName,
        variantName: [cpuName, ramGb ? `${ramGb} GB RAM` : null, storageGb ? `${storageGb} GB` : null].filter(Boolean).join(" / ") || "Standard",
        majorSignals: inferMajorSignals(itemName, { ramGb, storageGb, hasDiscreteGpu: hasDiscrete }),
        _meta: {
          retrievedAt,
          acquisitionMethod: "api",
          inferredFields:    ["performance_score", "battery_score", "portability_score"],
          realFields:        ["ramGb", "storageGb", "cpuName", "gpuType", "displayInches"]
        },
        rawSpecs: {
          ram:               ramGb     ? `${ramGb} GB`         : "Unknown",
          storage:           storageGb ? `${storageGb} GB SSD` : "Unknown",
          gpu:               hasDiscrete ? "Discrete GPU" : gpuModel || "Integrated",
          display_size:      displayIn  ? `${displayIn}"`      : "Unknown",
          performance_score: String(perfScore),
          display_score:     displayIn >= 14 ? "80" : "72",
          battery_score:     "68",
          portability_score: "65",
          thermals_score:    hasDiscrete ? "63" : "75",
        },
        reviewEvidence: { topCons: [], reviewRiskScore: 0.2, reviewCoverage: 0 },
        trustEvidence:  { sourceConfidence: 0.90, freshnessDays: 0 },
        offers: []
      });

      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      console.error(`[TechSpecs] ⚠️  ${id}: ${e.message}`);
    }
  }

  console.log(`[TechSpecs] ✅ ${results.length} products with real specs`);
  return results;
}

// ── Rainforest API Fetcher ────────────────────────────────────────────────────
// Amazon product data without PA-API restrictions.
// Reads RAINFOREST_API_KEY from environment — no DB needed.

const RAINFOREST_BASE = "https://api.rainforestapi.com/request";
const PRICE_MIN = 300;
const PRICE_MAX = 1900;

async function fetchRainforest() {
  const apiKey = process.env.RAINFOREST_API_KEY;
  if (!apiKey) throw new Error("RAINFOREST_API_KEY not set");

  const retrievedAt = new Date().toISOString();

  // Multiple search terms for broader coverage
  const searchTerms = [
    "student laptop",
    "thin light laptop",
    "business laptop",
    "MacBook Air",
    "ThinkPad laptop",
  ];

  const seen = new Set();
  const results = [];

  for (const term of searchTerms) {
    const url = new URL(RAINFOREST_BASE);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("type", "search");
    url.searchParams.set("amazon_domain", "amazon.com");
    url.searchParams.set("search_term", term);
    url.searchParams.set("category_id", "565108"); // Laptops category
    url.searchParams.set("min_price", String(PRICE_MIN));
    url.searchParams.set("max_price", String(PRICE_MAX));

    console.log(`[Rainforest] Searching: "${term}"…`);

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`[Rainforest] ❌ ${res.status} for "${term}"`);
      continue;
    }
    const data = await res.json();
    const items = data.search_results ?? [];

    for (const item of items) {
      if (item.sponsored) continue;
      const asin = item.asin;
      if (!asin || seen.has(asin)) continue;
      seen.add(asin);

      const priceUsd = item.price?.value ?? 0;
      if (priceUsd < PRICE_MIN || priceUsd > PRICE_MAX) continue;

      const title = item.title || "Unknown Laptop";
      const specs = parseSpecsFromTitle(title);
      const rating = item.rating ?? 0;
      const ratingsTotal = item.ratings_total ?? 0;
      const perfScore = estimatePerformanceScore(specs);
      const reviewScore = rating ? Math.round(rating * 20) : 70;

      results.push({
        sourceId: `rainforest-${asin}`,
        sourceType: "retailer",
        sourceName: "Amazon",
        sourceUrl: item.link || `https://www.amazon.com/dp/${asin}`,
        itemName: title,
        variantName: "Standard",
        majorSignals: inferMajorSignals(title, specs),
        _meta: {
          retrievedAt,
          acquisitionMethod: "api",
          inferredFields: ["performance_score", "display_score", "battery_score", "portability_score", "thermals_score"],
          realFields: ["priceUsd", "reviewRating", "reviewCount"]
        },
        rawSpecs: {
          ram: specs.ramGb ? `${specs.ramGb} GB` : "Unknown",
          storage: specs.storageGb ? `${specs.storageGb} GB SSD` : "Unknown",
          gpu: specs.hasDiscreteGpu ? "Discrete GPU" : "Integrated",
          performance_score: String(perfScore),
          display_score: String(reviewScore > 80 ? 82 : 70),
          battery_score: "68",
          portability_score: "65",
          thermals_score: String(specs.hasDiscreteGpu ? 65 : 74)
        },
        reviewEvidence: {
          topCons: [],
          reviewRiskScore: ratingsTotal > 500 ? 0.15 : ratingsTotal > 100 ? 0.25 : 0.4,
          reviewCoverage: Math.min(ratingsTotal, 9999)
        },
        trustEvidence: {
          sourceConfidence: ratingsTotal > 500 ? 0.82 : ratingsTotal > 100 ? 0.70 : 0.55,
          freshnessDays: 0
        },
        offers: [{
          seller: "Amazon",
          priceUsd,
          condition: "new",
          affiliate: true
        }]
      });
    }

    console.log(`[Rainforest] "${term}" → ${items.length} results (${results.length} unique so far)`);
    // Small delay to be respectful
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}

// ── Amazon Review Enrichment (via Rainforest API) ────────────────────────────
// Fetches 1-3 star reviews for products with enough coverage to extract real cons.

const CON_PATTERNS = [
  { re: /thermal|overheat|hot\b|runs\s+hot|heat/i,         label: "thermal_throttling" },
  { re: /fan\s*noise|loud\s*fan|noisy|fan\s+loud/i,        label: "fan_noise" },
  { re: /battery\s*life|battery\s*drain|bad\s*battery/i,   label: "battery_life" },
  { re: /heavy|weight|too\s+heavy|bulky/i,                 label: "heavy_build" },
  { re: /screen|display|dim\b|glare|blurry/i,              label: "display_quality" },
  { re: /slow|lag|sluggish|freezes|performance/i,          label: "performance_issues" },
  { re: /build\s*quality|cheap\s*plastic|flimsy|creaks/i,  label: "build_quality" },
  { re: /keyboard|typing|key\s+travel|keys\s+feel/i,       label: "keyboard_issues" },
  { re: /speaker|audio|sound\s+quality|tinny/i,            label: "poor_speakers" },
  { re: /port|usb|connectivity|limited\s+ports/i,          label: "limited_ports" },
];

async function enrichWithRainforestReviews(products, apiKey) {
  // Only enrich Rainforest-sourced products that have enough reviews to be meaningful
  const targets = products
    .filter(p => p.sourceId.startsWith("rainforest-") && p.reviewEvidence.reviewCoverage > 50)
    .sort((a, b) => b.reviewEvidence.reviewCoverage - a.reviewEvidence.reviewCoverage)
    .slice(0, 15); // cap at 15 API calls to preserve free credits

  if (targets.length === 0) {
    console.log("[Reviews] No products with enough reviews to enrich");
    return;
  }

  console.log(`[Reviews] Fetching cons for top ${targets.length} products…`);
  let enriched = 0;

  for (const product of targets) {
    const asin = product.sourceId.replace("rainforest-", "");
    try {
      const url = new URL(RAINFOREST_BASE);
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("type", "reviews");
      url.searchParams.set("amazon_domain", "amazon.com");
      url.searchParams.set("asin", asin);
      url.searchParams.set("review_stars", "1_star,2_star,3_star"); // critical reviews have the cons
      url.searchParams.set("sort_by", "most_helpful");

      const res = await fetch(url.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.request_info?.message ?? `HTTP ${res.status}`;
        if (/temporarily unavailable/i.test(msg)) {
          console.log("[Reviews] ⏸  Rainforest reviews endpoint temporarily unavailable — skipping enrichment");
          return; // abort entire enrichment loop early
        }
        console.error(`[Reviews] ❌ ${asin}: ${msg}`);
        continue;
      }
      const reviews = data.reviews ?? [];

      const allText = reviews.map(r => `${r.title ?? ""} ${r.body ?? ""}`).join(" ");
      const cons = CON_PATTERNS.filter(p => p.re.test(allText)).map(p => p.label);

      if (cons.length > 0) {
        product.reviewEvidence.topCons = cons;
        product.reviewEvidence.reviewRiskScore = cons.length > 3 ? 0.45 : cons.length > 1 ? 0.3 : 0.2;
        enriched++;
        console.log(`[Reviews] ✅ ${product.itemName.slice(0, 55)}: [${cons.join(", ")}]`);
      } else {
        console.log(`[Reviews] — ${product.itemName.slice(0, 55)}: no cons detected`);
      }

      await new Promise(r => setTimeout(r, 600));
    } catch (e) {
      console.error(`[Reviews] ⚠️  ${asin}: ${e.message}`);
    }
  }

  console.log(`[Reviews] Done — ${enriched}/${targets.length} products have cons`);
}

// ── Amazon Review Enrichment (via RapidAPI Real-Time Amazon Data) ─────────────
// Uses CRITICAL reviews to extract real cons. Free tier: ~100 req/month.

const RAPIDAPI_AMAZON_HOST = "real-time-amazon-data.p.rapidapi.com";

async function enrichWithRapidApiReviews(products, rapidApiKey) {
  const targets = products
    .filter(p => p.sourceId.startsWith("rainforest-") && p.reviewEvidence.reviewCoverage > 50)
    .sort((a, b) => b.reviewEvidence.reviewCoverage - a.reviewEvidence.reviewCoverage)
    .slice(0, 12); // cap at 12 calls — preserve free tier credits

  if (targets.length === 0) {
    console.log("[RapidReviews] No products with enough reviews");
    return;
  }

  console.log(`[RapidReviews] Fetching cons for top ${targets.length} products…`);
  let enriched = 0;

  for (const product of targets) {
    const asin = product.sourceId.replace("rainforest-", "");
    try {
      const url = `https://${RAPIDAPI_AMAZON_HOST}/product-reviews?asin=${asin}&country=US&sort_by=TOP_REVIEWS&star_rating=CRITICAL&verified_purchases_only=false`;
      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key":  rapidApiKey,
          "X-RapidAPI-Host": RAPIDAPI_AMAZON_HOST,
        }
      });

      if (!res.ok) {
        console.error(`[RapidReviews] ❌ ${asin}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const reviews = data?.data?.reviews ?? [];
      const allText = reviews.map(r => `${r.review_title ?? ""} ${r.review_comment ?? ""}`).join(" ");
      const cons = CON_PATTERNS.filter(p => p.re.test(allText)).map(p => p.label);

      if (cons.length > 0) {
        product.reviewEvidence.topCons = cons;
        product.reviewEvidence.reviewRiskScore = cons.length > 3 ? 0.45 : cons.length > 1 ? 0.3 : 0.2;
        enriched++;
        console.log(`[RapidReviews] ✅ ${product.itemName.slice(0, 50)}: [${cons.join(", ")}]`);
      } else {
        console.log(`[RapidReviews] — ${product.itemName.slice(0, 50)}: no cons detected`);
      }

      await new Promise(r => setTimeout(r, 700));
    } catch (e) {
      console.error(`[RapidReviews] ⚠️  ${asin}: ${e.message}`);
    }
  }

  console.log(`[RapidReviews] Done — ${enriched}/${targets.length} products enriched`);
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
  const MAX_PAGES = 10;
  const buildUrl = (page) =>
    `https://api.bestbuy.com/v1/products(${query})?format=json&pageSize=${PAGE_SIZE}&page=${page}&sort=customerReviewCount.dsc&apiKey=${apiKey}&show=${fields}`;

  console.log("[BestBuy] Fetching laptops…");
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
    if (batch.length < PAGE_SIZE) break;
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
        inferredFields: ["performance_score", "display_score", "battery_score", "portability_score", "thermals_score"],
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
      offers: [{
        seller: "Best Buy",
        priceUsd: p.salePrice || p.regularPrice || 0,
        condition: "new",
        affiliate: true
      }]
    };
  }).filter(r => r.offers[0].priceUsd > 0);
}

// ── Reddit Review Enrichment ──────────────────────────────────────────────────

async function fetchRedditReviews(credentials, productNames) {
  const { client_id, client_secret, user_agent = "MajorLogic/1.0" } = credentials;
  if (!client_id || !client_secret) throw new Error("Reddit: client_id / client_secret missing");

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

  for (const name of productNames.slice(0, 10)) {
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
      reviewMap[name.toLowerCase()] = { cons, mentions };
      await new Promise(r => setTimeout(r, 300));
    } catch { /* skip on error */ }
  }

  return reviewMap;
}

// ── Amazon PA-API ─────────────────────────────────────────────────────────────

async function fetchAmazonPA(_credentials) {
  throw new Error("Amazon PA-API v5 signing not implemented — use Rainforest API instead");
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
  let sourceConfig = { sources: {} };
  try {
    const configPath = path.resolve(`domains/${domainId}/sources/source-config.json`);
    sourceConfig = JSON.parse(await fs.promises.readFile(configPath, "utf8"));
  } catch {
    console.log("[fetch-sources] No source-config.json — all sources enabled by default");
  }
  const isSourceEnabled = (slug) => sourceConfig.sources[slug]?.enabled !== false;

  const sources = [];

  // ── Step 1: Parser & Browser Workers (no DATABASE_URL needed) ────────────
  for (const [slug, cfg] of Object.entries(sourceConfig.sources ?? {})) {
    if (!cfg.enabled || cfg.method === "api") continue;

    console.log(`[${slug}] method=${cfg.method}`);
    try {
      let workerOut;
      if (cfg.method === "parser") {
        const workerPath = path.resolve(`scripts/${slug}-parser.js`);
        if (!fs.existsSync(workerPath)) {
          console.log(`[${slug}] ⚠️  Parser not found (${workerPath}) — skipping`);
          continue;
        }
        workerOut = await runWorker("node", [workerPath, `--domain=${domainId}`]);
      } else if (cfg.method === "browser") {
        const workerPath = path.resolve("scripts/webwright-worker.py");
        if (!fs.existsSync(workerPath)) {
          console.log(`[${slug}] ⚠️  Webwright worker not found — skipping`);
          continue;
        }
        const task = cfg.task ?? `Scrape 50 student laptops from ${slug}`;
        workerOut = await runWorker("python", [workerPath, `--domain=${domainId}`, `--source=${slug}`, `--task=${task}`]);
      } else continue;

      const records = JSON.parse(workerOut);
      sources.push(...records);
      console.log(`[${slug}] ✅ ${records.length} records via ${cfg.method}`);
    } catch (e) {
      console.error(`[${slug}] ❌ Worker failed: ${e.message}`);
    }
  }

  // ── Step 2: TechSpecs API — real hardware specs (weight, display, battery) ──
  if (process.env.TECHSPECS_API_KEY && isSourceEnabled("techspecs")) {
    try {
      const records = await fetchTechSpecs();
      sources.push(...records);
      console.log(`[TechSpecs] ✅ ${records.length} products with real specs`);
    } catch (e) {
      console.error(`[TechSpecs] ❌ ${e.message}`);
    }
  }

  // ── Step 3: Rainforest API (env var — no DATABASE_URL needed) ────────────
  if (process.env.RAINFOREST_API_KEY && isSourceEnabled("rainforest")) {
    try {
      const records = await fetchRainforest();
      sources.push(...records);
      console.log(`[Rainforest] ✅ ${records.length} Amazon products`);
    } catch (e) {
      console.error(`[Rainforest] ❌ ${e.message}`);
    }

    // Step 3b: Enrich with cons — RapidAPI first, fall back to Rainforest
    if (process.env.RAPIDAPI_KEY) {
      try {
        await enrichWithRapidApiReviews(sources, process.env.RAPIDAPI_KEY);
      } catch (e) {
        console.error(`[RapidReviews] ❌ ${e.message}`);
      }
    } else {
      try {
        await enrichWithRainforestReviews(sources, process.env.RAINFOREST_API_KEY);
      } catch (e) {
        console.error(`[Reviews] ❌ ${e.message}`);
      }
    }
  }

  // ── Step 4: DB-backed API integrations (requires DATABASE_URL) ────────────
  if (!process.env.DATABASE_URL) {
    console.log("[fetch-sources] No DATABASE_URL — skipping DB integrations (BestBuy, Reddit).");
  } else {
    let client;
    try {
      client = await createPostgresClient(process.env.DATABASE_URL);
      const repo = new PostgresPlatformRepository(client);

      const integrations = await repo.getIntegrations();
      const active = Object.fromEntries(
        integrations.filter(i => i.is_active && i.has_credentials).map(i => [i.slug, i])
      );
      const getFullCreds = async (slug) => (await repo.getIntegrationBySlug(slug))?.credentials ?? {};

      if (active.bestbuy && isSourceEnabled("bestbuy")) {
        try {
          const records = await fetchBestBuy(await getFullCreds("bestbuy"), domainId);
          console.log(`[BestBuy] ✅ ${records.length} laptops`);
          sources.push(...records);
        } catch (e) { console.error(`[BestBuy] ❌ ${e.message}`); }
      }

      if (active.amazon_pa && isSourceEnabled("amazon_pa")) {
        try {
          await fetchAmazonPA(await getFullCreds("amazon_pa"));
        } catch (e) { console.error(`[Amazon PA] ❌ ${e.message}`); }
      }

      // Reddit enriches ALL sources (parser + Rainforest + BestBuy)
      if (active.reddit && isSourceEnabled("reddit") && sources.length) {
        try {
          const names = [...new Set(sources.map(s => s.itemName))];
          console.log(`[Reddit] Fetching reviews for ${names.length} products…`);
          const reviewMap = await fetchRedditReviews(await getFullCreds("reddit"), names);

          for (const source of sources) {
            const key = source.itemName.toLowerCase();
            const review = Object.entries(reviewMap).find(([k]) => {
              const keyWords = k.toLowerCase().split(/\s+/).filter(w => w.length > 3);
              if (!keyWords.length) return false;
              return keyWords.filter(w => key.includes(w)).length >= Math.min(2, keyWords.length);
            })?.[1];
            if (review) {
              source.reviewEvidence.topCons = review.cons;
              source.reviewEvidence.reviewCoverage = review.mentions;
              source.reviewEvidence.reviewRiskScore = review.cons.length > 2 ? 0.45 : 0.2;
            }
          }
          console.log(`[Reddit] ✅ Enriched ${Object.keys(reviewMap).length} products`);
        } catch (e) { console.error(`[Reddit] ❌ ${e.message}`); }
      }
    } finally {
      if (client) await client.end();
    }
  }

  // ── Step 5: Write output ──────────────────────────────────────────────────
  if (sources.length === 0) {
    console.log("[fetch-sources] No sources fetched — keeping existing market-sources.json");
    return;
  }

  const seen = new Set();
  const unique = sources.filter(s => {
    const key = s.itemName.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await fs.promises.writeFile(sourcesPath, JSON.stringify(unique, null, 2));
  console.log(`\n✅ market-sources.json updated: ${unique.length} products → ${sourcesPath}`);
}

run().catch(err => {
  console.error("\n❌ fetch-sources failed:", err.message);
  process.exit(1);
});
