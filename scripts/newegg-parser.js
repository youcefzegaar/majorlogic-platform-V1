#!/usr/bin/env node
/**
 * newegg-parser.js
 *
 * Playwright-based parser for Newegg laptop listings.
 * Extracts: name, price, rating, review count, specs from product titles.
 *
 * method: "parser" in source-config.json
 * Usage: node scripts/newegg-parser.js --domain=laptop-student-us
 * Outputs: JSON array to stdout matching market-sources.json schema.
 */

import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
chromium.use(stealthPlugin());

const BASE       = "https://www.newegg.com";
const PRICE_MIN  = 300;
const PRICE_MAX  = 1900;
const MAX_PAGES  = 5;
const PAGE_SIZE  = 36;

// ── Spec parsers ─────────────────────────────────────────────────────────────

function parseSpecsFromTitle(title) {
  const t = title || "";
  const ramMatch = t.match(/(\d+)GB(?:\s+(?:RAM|LPDDR|DDR|Memory))?/i);
  const ramGb = ramMatch ? parseInt(ramMatch[1]) : 0;

  const tbMatch = t.match(/(\d+(?:\.\d+)?)\s*TB/i);
  const gbSsdMatch = t.match(/(\d+)\s*GB\s*(?:SSD|NVMe|HDD|Storage)/i);
  const storageGb = tbMatch
    ? Math.round(parseFloat(tbMatch[1]) * 1024)
    : gbSsdMatch ? parseInt(gbSsdMatch[1]) : 0;

  const hasDiscreteGpu = /RTX\s*\d|GTX\s*\d|RX\s*\d{4}|Radeon\s*RX|Arc\s*[AB]\d/i.test(t);

  return { ramGb, storageGb, hasDiscreteGpu };
}

function estimatePerformanceScore(specs) {
  let score = 50;
  if (specs.ramGb >= 32) score += 25;
  else if (specs.ramGb >= 16) score += 15;
  else if (specs.ramGb >= 8) score += 5;
  if (specs.storageGb >= 1024) score += 10;
  else if (specs.storageGb >= 512) score += 5;
  if (specs.hasDiscreteGpu) score += 15;
  return Math.min(score, 98);
}

function inferMajorSignals(name = "", specs = {}) {
  const n = name.toLowerCase();
  const signals = ["general"];
  if (specs.hasDiscreteGpu || n.includes("gaming") || n.includes("nitro") || n.includes("loq"))
    signals.push("engineering", "design");
  if (specs.ramGb >= 16) signals.push("cs", "engineering");
  if (n.includes("thinkpad") || n.includes("latitude") || n.includes("elitebook"))
    signals.push("business");
  if (n.includes("macbook")) signals.push("design", "cs");
  return [...new Set(signals)];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const retrievedAt = new Date().toISOString();
  const results = [];

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" }
  });

  try {
    const page = await context.newPage();

    for (let p = 1; p <= MAX_PAGES; p++) {
      const url = `${BASE}/Laptops-Notebooks/SubCategory/ID-32/Type=SubCategory?Tid=5714&LeftPriceRange=${PRICE_MIN}&RightPriceRange=${PRICE_MAX}&PageSize=${PAGE_SIZE}&page=${p}`;
      console.error(`[newegg] Page ${p}/${MAX_PAGES}…`);

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Wait for product items
      await page.waitForSelector(".item-container", { timeout: 10000 }).catch(() => {});

      const items = await page.$$eval(".item-container", (els) =>
        els.map(el => ({
          name:    el.querySelector(".item-title")?.textContent?.trim() ?? "",
          href:    el.querySelector(".item-title a")?.href ?? "",
          price:   el.querySelector(".price-current strong")?.textContent?.trim() ?? "",
          rating:  el.querySelector(".item-rating")?.getAttribute("aria-label") ?? "",
          reviews: el.querySelector(".item-review")?.textContent?.trim() ?? "0",
          specs:   Array.from(el.querySelectorAll(".item-features li")).map(li => li.textContent.trim())
        }))
      );

      if (!items.length) {
        console.error(`[newegg] No items on page ${p} — stopping`);
        break;
      }

      for (const item of items) {
        if (!item.name || !item.href) continue;

        const priceRaw = item.price.replace(/[^0-9.]/g, "");
        const priceUsd = parseFloat(priceRaw) || 0;
        if (priceUsd < PRICE_MIN || priceUsd > PRICE_MAX) continue;

        const ratingMatch = item.rating.match(/(\d+(?:\.\d+)?)\s*out\s*of/i);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
        const reviewCount = parseInt(item.reviews.replace(/\D/g, "")) || 0;

        // Try to get specs from the specs list first, then fall back to title
        const specsText = item.specs.join(" ") + " " + item.name;
        const specs = parseSpecsFromTitle(specsText);
        const perfScore = estimatePerformanceScore(specs);
        const reviewScore = rating ? Math.round(rating * 20) : 70;

        const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

        results.push({
          sourceId:    `newegg-${slug}`,
          sourceType:  "retailer",
          sourceName:  "Newegg",
          sourceUrl:   item.href,
          itemName:    item.name,
          variantName: "Standard",
          majorSignals: inferMajorSignals(item.name, specs),
          _meta: {
            retrievedAt,
            acquisitionMethod: "parser",
            inferredFields: ["performance_score", "display_score", "battery_score", "portability_score", "thermals_score"],
            realFields: ["priceUsd", "reviewRating", "reviewCount"]
          },
          rawSpecs: {
            ram:               specs.ramGb ? `${specs.ramGb} GB` : "Unknown",
            storage:           specs.storageGb ? `${specs.storageGb} GB SSD` : "Unknown",
            gpu:               specs.hasDiscreteGpu ? "Discrete GPU" : "Integrated",
            performance_score: String(perfScore),
            display_score:     String(reviewScore > 80 ? 82 : 70),
            battery_score:     "68",
            portability_score: "65",
            thermals_score:    String(specs.hasDiscreteGpu ? 65 : 74)
          },
          reviewEvidence: {
            topCons:         [],
            reviewRiskScore: reviewCount > 200 ? 0.15 : reviewCount > 50 ? 0.25 : 0.4,
            reviewCoverage:  Math.min(reviewCount, 9999)
          },
          trustEvidence: {
            sourceConfidence: reviewCount > 200 ? 0.80 : reviewCount > 50 ? 0.68 : 0.52,
            freshnessDays:    0
          },
          offers: [{ seller: "Newegg", priceUsd, condition: "new", affiliate: false }]
        });
      }

      console.error(`[newegg] Page ${p} → ${items.length} items (${results.length} total so far)`);

      // Check if last page
      const hasNext = await page.$(".btn-next:not([disabled])");
      if (!hasNext) break;

      await new Promise(r => setTimeout(r, 1000));
    }
  } finally {
    await browser.close();
  }

  console.error(`[newegg] Done — ${results.length} laptops extracted`);
  process.stdout.write(JSON.stringify(results, null, 2) + "\n");
}

run().catch(err => {
  console.error(`[newegg] ❌ Fatal: ${err.message}`);
  process.exit(1);
});
