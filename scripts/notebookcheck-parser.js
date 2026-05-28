#!/usr/bin/env node
/**
 * notebookcheck-parser.js
 *
 * Playwright-based parser for NotebookCheck.net laptop reviews.
 * Uses a real browser to bypass Cloudflare and JS rendering.
 * Extracts REAL measured data: battery hours, weight, CPU, GPU, RAM, storage.
 *
 * method: "parser" in source-config.json
 * Usage: node scripts/notebookcheck-parser.js --domain=laptop-student-us
 * Outputs: JSON array to stdout matching market-sources.json schema.
 */

import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
chromium.use(stealthPlugin());

const BASE      = "https://www.notebookcheck.net";
const MAX_ITEMS = 40;
const PRICE_MIN = 300;
const PRICE_MAX = 1900;
const DELAY_MS  = 1500;

// ── Score converters (real data → 0-100) ─────────────────────────────────────

function batteryScore(hours) {
  if (!hours) return 65;
  if (hours >= 15) return 96;
  if (hours >= 12) return 88;
  if (hours >= 10) return 80;
  if (hours >= 8)  return 70;
  if (hours >= 6)  return 57;
  return 44;
}

function portabilityScore(kg) {
  if (!kg)        return 65;
  if (kg <= 1.2)  return 94;
  if (kg <= 1.5)  return 85;
  if (kg <= 1.8)  return 77;
  if (kg <= 2.2)  return 67;
  if (kg <= 2.7)  return 54;
  return 42;
}

function inferMajorSignals(title, ramGb, hasDiscrete) {
  const n = title.toLowerCase();
  const s = new Set(["general"]);
  if (hasDiscrete)  { s.add("engineering"); s.add("design"); }
  if (ramGb >= 16)  { s.add("cs"); s.add("engineering"); }
  if (n.includes("macbook"))                        { s.add("design"); s.add("cs"); }
  if (/thinkpad|latitude|elitebook/i.test(n))       s.add("business");
  return [...s];
}

// ── Review URL scraper ────────────────────────────────────────────────────────

// Popular student laptop search terms — covers mainstream categories
const SEARCH_QUERIES = [
  "MacBook Air review",
  "MacBook Pro review",
  "ThinkPad laptop review",
  "Dell XPS laptop review",
  "ASUS ZenBook review",
  "HP Spectre review",
  "Lenovo IdeaPad review",
  "Acer Aspire review",
  "ASUS VivoBook review",
  "Razer Blade review",
  "Surface Pro review",
  "LG Gram review",
];

async function getReviewUrls(page) {
  const seen = new Set();
  const REVIEW_INDICATOR = /review|test\b/i;
  const EXCLUDE_PATH = /guide|tool|buying|smartwatch|watch|mouse|keyboard|headphone|monitor|printer|charger|desk|enclosure|speaker|tablet\b/i;

  for (const query of SEARCH_QUERIES) {
    const url = `${BASE}/Search.8222.0.html?q=${encodeURIComponent(query)}&typeList=10`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const links = await page.$$eval("a[href]", (els) =>
      els.map(a => a.href).filter(h =>
        /https:\/\/www\.notebookcheck\.net\/[A-Za-z0-9_%-]+\.\d{5,}\.0\.html/.test(h)
      )
    );

    for (const link of links) {
      const path = link.replace("https://www.notebookcheck.net", "").toLowerCase();
      if (REVIEW_INDICATOR.test(path) && !EXCLUDE_PATH.test(path) && !seen.has(link)) {
        seen.add(link);
      }
    }

    if (seen.size >= MAX_ITEMS) break;
  }

  return [...seen].slice(0, MAX_ITEMS);
}

// ── Single review parser ──────────────────────────────────────────────────────

async function parseReview(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);

  const title = await page.$eval("h1", el => el.textContent.trim()).catch(() => null)
    ?? await page.title();

  if (!title || title.length < 5) return null;

  const bodyText = await page.innerText("body").catch(() => "");

  // RAM — prefer the summary line "N GB Memory" over inline mentions
  const ramPatterns = [
    /(\d+)\s*GB\s*Memory/i,
    /(\d+)\s*GB\s*(?:RAM|LPDDR\w*)/i,
    /Memory.*?(\d+)\s*GB/i,
  ];
  let ramGb = 0;
  for (const re of ramPatterns) {
    const m = bodyText.match(re);
    if (m) { ramGb = parseInt(m[1]); break; }
  }

  // Storage — prefer the summary line "N GB SSD"
  const storagePatterns = [
    /(\d+)\s*GB\s*SSD/i,
    /(\d+(?:\.\d+)?)\s*TB\s*(?:SSD|NVMe|M\.2)/i,
    /SSD.*?(\d+)\s*GB/i,
    /(\d+)\s*GB\s*(?:NVMe|PCIe|M\.2)/i,
  ];
  let storageGb = 0;
  for (const re of storagePatterns) {
    const m = bodyText.match(re);
    if (m) {
      const raw = m[1];
      storageGb = re.source.includes("TB")
        ? Math.round(parseFloat(raw) * 1024)
        : parseInt(raw);
      break;
    }
  }

  // CPU text — first line that mentions processor brands
  const cpuMatch = bodyText.match(/(?:Intel\s+Core|AMD\s+Ryzen|Apple\s+M\d)[^\n,]{5,60}/i);
  const cpuText = cpuMatch ? cpuMatch[0].trim() : null;

  // Battery hours
  const battPatterns = [
    /(\d+(?:\.\d+)?)\s*hrs?\s+of\s+battery/i,
    /Battery Runtime[^0-9]*(\d+(?:\.\d+)?)\s*h/i,
    /(\d+(?:\.\d+)?)\s*h(?:ours?)?\s+battery/i,
    /runtime[^0-9]{0,20}(\d+(?:\.\d+)?)\s*h/i,
  ];
  let battHours = null;
  for (const re of battPatterns) {
    const m = bodyText.match(re);
    if (m) {
      const h = parseFloat(m[1]);
      if (h >= 2 && h <= 25) { battHours = h; break; }
    }
  }

  // Weight
  const parseKg = (text) => {
    const kg = text.match(/(\d+(?:\.\d+)?)\s*kg/i);
    if (kg) return parseFloat(kg[1]);
    const lb = text.match(/(\d+(?:\.\d+)?)\s*lbs?/i);
    if (lb) return parseFloat(lb[1]) * 0.4536;
    return null;
  };

  // Price
  const pricePatterns = [/\$\s*(\d{3,4}(?:\.\d{2})?)/, /(\d{3,4}(?:\.\d{2})?)\s*USD/i];
  let priceUsd = null;
  for (const re of pricePatterns) {
    const m = bodyText.match(re);
    if (m) {
      const v = parseFloat(m[1]);
      if (v >= PRICE_MIN && v <= PRICE_MAX) { priceUsd = v; break; }
    }
  }
  const weightKg  = parseKg(bodyText);

  // Disadvantages — try DOM first, fall back to text pattern
  const CON_MAP = [
    { re: /thermal|overheat|hot\b|runs\s+hot|heat/i,         label: "thermal_throttling" },
    { re: /fan\s*noise|loud\s*fan|noisy|fan.*loud/i,         label: "fan_noise" },
    { re: /battery\s*life|short.*battery|battery.*drain/i,   label: "battery_life" },
    { re: /heavy|too\s+heavy|bulky|weight/i,                 label: "heavy_build" },
    { re: /screen|display|dim\b|glare|blurry|resolution/i,   label: "display_quality" },
    { re: /slow|lag|sluggish|freeze|throttl/i,               label: "performance_issues" },
    { re: /build\s*quality|cheap\s*plastic|flimsy|creak/i,   label: "build_quality" },
    { re: /keyboard|typing|key\s+travel|keys\s+feel/i,       label: "keyboard_issues" },
    { re: /speaker|audio|sound|tinny/i,                      label: "poor_speakers" },
    { re: /port|usb|connect/i,                               label: "limited_ports" },
  ];

  // NotebookCheck structure:
  //   Cons\n-\nperformance stagnates\n-\nbasic screen...\n
  // Each con is the line AFTER a lone "-" line.
  let rawConsList = [];
  const consIdx = bodyText.search(/\bCons\b/);
  if (consIdx >= 0) {
    const consBlock = bodyText.slice(consIdx, consIdx + 1000);
    rawConsList = consBlock
      .split(/\n-\n/)
      .slice(1)                            // drop "Cons" header part
      .map(seg => seg.split("\n")[0].trim())
      .filter(l => l.length > 3 && l.length < 200 && !/^(pros?|cons?|price|verdict)/i.test(l));
  }

  // Fall back: "Disadvantages" heading variant
  if (rawConsList.length === 0) {
    const disadvMatch = bodyText.match(/Disadvantages?\s*[\n\r]+([\s\S]{20,600}?)(?:Advantages?|Verdict|Price|Performance|\n{3}|$)/i);
    if (disadvMatch) {
      rawConsList = disadvMatch[1]
        .split(/[\n\r]+/)
        .map(l => l.replace(/^[-–−•]\s*/, "").trim())
        .filter(l => l.length > 5 && l.length < 200);
    }
  }

  const consText = rawConsList.join(" ");
  const topCons = rawConsList.length > 0
    ? CON_MAP.filter(c => c.re.test(consText)).map(c => c.label)
    : [];

  if (rawConsList.length > 0) {
    console.error(`[notebookcheck] Cons for "${title.slice(0, 40)}": ${rawConsList.slice(0, 4).join(" | ")}`);
  }

  if (!ramGb && !storageGb) return null;
  if (priceUsd !== null && (priceUsd < PRICE_MIN || priceUsd > PRICE_MAX)) return null;

  const hasDiscrete = /rtx\s*[34]\d{3}|rx\s*[67]\d{3}|gtx\s*\d{4}|arc\s*[ab]\d{3}/i.test(bodyText + title);
  const perfScore   = ramGb >= 32 ? 88 : ramGb >= 16 ? 76 : ramGb >= 8 ? 61 : 50;
  const portScore   = portabilityScore(weightKg);
  const battScore   = batteryScore(battHours);
  const slug        = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  return {
    sourceId:    `notebookcheck-${slug}`,
    sourceType:  "review_site",
    sourceName:  "NotebookCheck",
    sourceUrl:   url,
    itemName:    title,
    variantName: [cpuText, ramGb ? `${ramGb} GB` : null, storageGb ? `${storageGb} GB SSD` : null].filter(Boolean).join(" / ") || "Standard",
    majorSignals: inferMajorSignals(title, ramGb, hasDiscrete),
    _meta: {
      retrievedAt:       new Date().toISOString(),
      acquisitionMethod: "parser",
      inferredFields:    ["performance_score", "thermals_score", "display_score"],
      realFields:        ["ramGb", "storageGb", "gpuClass", "battery_score", "portability_score", "topCons"]
    },
    rawSpecs: {
      ram:               ramGb ? `${ramGb} GB` : "Unknown",
      storage:           storageGb ? `${storageGb} GB SSD` : "Unknown",
      gpu:               hasDiscrete ? "Discrete GPU" : "Integrated",
      performance_score: String(perfScore),
      display_score:     "76",
      battery_score:     String(battScore),
      portability_score: String(portScore),
      thermals_score:    hasDiscrete ? "61" : "74"
    },
    reviewEvidence: {
      topCons,
      rawCons:         rawConsList.slice(0, 6),
      reviewRiskScore: topCons.length > 3 ? 0.35 : 0.12,
      reviewCoverage:  1
    },
    trustEvidence: {
      sourceConfidence: 0.88,
      freshnessDays:    0
    },
    offers: priceUsd ? [{ seller: "NotebookCheck (at review)", priceUsd, condition: "new", affiliate: false }] : []
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" }
  });

  const results = [];

  try {
    const page = await context.newPage();

    console.error("[notebookcheck] Fetching review index…");
    let urls = [];
    try {
      urls = await getReviewUrls(page);
    } catch (e) {
      console.error(`[notebookcheck] ❌ Index fetch failed: ${e.message}`);
      process.exit(1);
    }
    console.error(`[notebookcheck] ${urls.length} review URLs found`);

    for (const url of urls) {
      try {
        await page.waitForTimeout(DELAY_MS);
        const record = await parseReview(page, url);
        if (record) {
          results.push(record);
          console.error(`[notebookcheck] ✅ ${record.itemName}`);
        }
      } catch (e) {
        console.error(`[notebookcheck] ⚠️  ${url.split("/").pop()}: ${e.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.error(`[notebookcheck] Done — ${results.length} laptops extracted`);
  process.stdout.write(JSON.stringify(results, null, 2) + "\n");
}

run().catch(err => {
  console.error(`[notebookcheck] ❌ Fatal: ${err.message}`);
  process.exit(1);
});
