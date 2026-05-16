/**
 * Programmatic SEO Page Generator
 *
 * يُشغّل محرك القرار offline لكل تركيبة (major × budget tier)
 * ويُولّد 25 ملف JSON جاهزة يستخدمها السيرفر كـ static-like pages.
 *
 * الاستخدام:   node scripts/generate-seo-pages.js
 * التشغيل التلقائي: يُستدعى من catalog-build.js بعد نشر الكتالوج.
 */

import fs   from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./env.js";
import { executeUniversalPipeline } from "../packages/platform-core/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, "..");

loadEnvFile(path.join(root, ".env"));

// ── SEO Matrix Definition ──────────────────────────────────────────────────

const MAJORS = [
  {
    key:        "computer-science",
    engineMajor:"cs",
    label:      "Computer Science",
    h1Suffix:   "Computer Science Students",
    intent:     "Long battery, strong CPU for compiling, enough RAM for virtual machines and AI work.",
    tools:      { toolAi: true, toolVms: true, toolCad: false, toolAdobe: false, toolGaming: false }
  },
  {
    key:        "engineering",
    engineMajor:"engineering",
    label:      "Engineering",
    h1Suffix:   "Engineering Students",
    intent:     "Powerful CPU, dedicated GPU for CAD and simulations, reliable thermal management.",
    tools:      { toolAi: false, toolVms: false, toolCad: true, toolAdobe: false, toolGaming: false }
  },
  {
    key:        "design",
    engineMajor:"design",
    label:      "Design & Creative Arts",
    h1Suffix:   "Design Students",
    intent:     "OLED display, color accuracy, enough power for Adobe Creative Suite and video editing.",
    tools:      { toolAi: false, toolVms: false, toolCad: false, toolAdobe: true, toolGaming: false }
  },
  {
    key:        "medical",
    engineMajor:"medical",
    label:      "Medical & Health Sciences",
    h1Suffix:   "Medical Students",
    intent:     "All-day battery, lightweight for hospital rounds, reliable and fast SSD.",
    tools:      { toolAi: false, toolVms: false, toolCad: false, toolAdobe: false, toolGaming: false }
  },
  {
    key:        "general",
    engineMajor:"general",
    label:      "College Students",
    h1Suffix:   "College Students",
    intent:     "Great value, long battery, reliable for everyday coursework and notes.",
    tools:      { toolAi: false, toolVms: false, toolCad: false, toolAdobe: false, toolGaming: false }
  }
];

const BUDGET_TIERS = [
  { key: "under-800",   maxBudget: 750,  label: "Under $800",   searchModifier: "budget" },
  { key: "under-1200",  maxBudget: 1150, label: "Under $1,200", searchModifier: "mid-range" },
  { key: "under-1500",  maxBudget: 1450, label: "Under $1,500", searchModifier: "mid-range" },
  { key: "under-2000",  maxBudget: 1900, label: "Under $2,000", searchModifier: "premium" },
  { key: "any-budget",  maxBudget: 3000, label: "Any Budget",   searchModifier: "best" }
];

// ── Pipeline ───────────────────────────────────────────────────────────────

async function generatePage(major, budget, repository, publishedEntities, decisionConfig, domainPack) {
  const { PublishedCatalog }        = await import("../packages/published-catalog/src/index.js");

  const profile = {
    id:         `seo_${major.key}_${budget.key}`,
    major:       major.engineMajor,
    budgetUsd:   budget.maxBudget,
    preferences: {
      portability: major.key === "medical" ? 85 : 55,
      battery:     major.key === "medical" ? 88 : 65,
      display:     major.key === "design"  ? 90 : 60,
      resale:      70
    },
    sliders: {
      virtual_machines: major.tools.toolVms    ? 82 : 20,
      video_4k:         major.tools.toolAdobe  ? 75 : 18,
      gaming:           major.tools.toolGaming ? 80 : 15,
      portability:      major.key === "medical" ? 88 : 55
    },
    context: { acceptsOpenBox: false, acceptsRefurbished: false, financingAllowed: true },
    productIntent: {
      performancePreference: major.key === "engineering" ? "performance_first" : "safe_balanced",
      osPreference:          major.key === "design"      ? "mac_preferred"     : "windows_preferred",
      screenSize:            "14_16",
      naturalLanguageIntent: major.intent
    }
  };

  try {
    const result = await executeUniversalPipeline({
      profile,
      domainPack,
      publishedEntities,
      catalogVersion: null,
      publishRunId:   null,
      decisionConfig,
      repository:     null   // SEO generation runs without DB writes (read-only)
    });

    if (!result.decision || result.decision.status !== "ok" || !result.decision.cards?.length) {
      return null;
    }

    return {
      major:   major.key,
      budget:  budget.key,
      slug:    `${major.key}/${budget.key}`,
      meta: {
        majorLabel:  major.label,
        budgetLabel: budget.label,
        h1:          `Best Laptops for ${major.h1Suffix} ${budget.label === "Any Budget" ? "in 2026" : budget.label + " (2026)"}`,
        description: `We analyzed 13+ laptops using 47 criteria to find the best ${budget.searchModifier} picks for ${major.label} students. Independent, unbiased, affiliate-disclosed.`,
        canonical:   `/laptops/${major.key}${budget.key === "any-budget" ? "" : "/" + budget.key}`
      },
      cards:         result.decision.cards,
      commercialRoutes: result.commercialRoutes?.routes ?? [],
      generatedAt:   new Date().toISOString()
    };
  } catch {
    return null;
  }
}

async function run() {
  console.log("\n🔍 [SEO Generator] Starting Programmatic SEO page generation...\n");

  // Load dependencies
  const { createPostgresClient, PostgresPlatformRepository } = await import("../packages/postgres-persistence/src/index.js");
  const { laptopStudentUsDomainPack } = await import("../domains/laptop-student-us/domain-pack.js");
  const { resolvePublishedCatalog }   = await import("../packages/postgres-persistence/src/catalog-loader.js");

  const client     = process.env.DATABASE_URL ? await createPostgresClient(process.env.DATABASE_URL) : null;
  const repository = client ? new PostgresPlatformRepository(client) : null;
  // if (repository) await repository.applyMigrations();

  const catalogState = await resolvePublishedCatalog({
    repository,
    domainId: "laptop-student-us",
    generatedFilePath: path.join(root, "domains/laptop-student-us/generated/published-catalog.generated.json")
  });

  if (!catalogState.entities.length) {
    console.error("[SEO Generator] No published entities — run catalog-build first.");
    process.exit(1);
  }

  // Load decision config
  const configRaw = fs.readFileSync(
    path.join(root, "domains/laptop-student-us/decision-config.json"), "utf8"
  );
  const decisionConfig = JSON.parse(configRaw);

  // Output directory
  const outDir = path.join(root, "domains/laptop-student-us/generated/seo-pages");
  fs.mkdirSync(outDir, { recursive: true });

  const index = []; // For sitemap generation
  let generated = 0;

  for (const major of MAJORS) {
    for (const budget of BUDGET_TIERS) {
      const page = await generatePage(major, budget, repository, catalogState.entities, decisionConfig, laptopStudentUsDomainPack);
      if (page) {
        const filename = path.join(outDir, `${major.key}__${budget.key}.json`);
        fs.writeFileSync(filename, JSON.stringify(page, null, 2));
        index.push({ slug: page.slug, canonical: page.meta.canonical, h1: page.meta.h1, generatedAt: page.generatedAt });
        console.log(`  ✅ /laptops/${page.slug}`);
        generated++;
      } else {
        console.warn(`  ⚠️  Skipped /laptops/${major.key}/${budget.key} (no results in budget)`);
      }
    }
  }

  // Write master index
  fs.writeFileSync(
    path.join(outDir, "_index.json"),
    JSON.stringify({ generated, pages: index, generatedAt: new Date().toISOString() }, null, 2)
  );

  // Generate sitemap.xml
  const sitemapUrls = index.map(p =>
    `  <url><loc>https://majorlogic.ai${p.canonical}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`
  ).join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://majorlogic.ai/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://majorlogic.ai/search</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
${sitemapUrls}
</urlset>`;
  const publicDir = path.join(root, "apps/api/public");
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap);
  console.log(`\n  📍 sitemap.xml updated (${index.length + 2} URLs)`);

  if (client) await client.end();
  console.log(`\n✅ [SEO Generator] ${generated}/25 pages generated.\n`);
}

run().catch(err => {
  console.error("[SEO Generator] Error:", err.message);
  process.exit(1);
});
