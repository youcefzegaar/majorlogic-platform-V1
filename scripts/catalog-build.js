import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runProcess(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [scriptPath, ...args], {
      stdio: "inherit",
      cwd: path.resolve(__dirname, "..")
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Process ${scriptPath} exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function run() {
  const args = process.argv.slice(2);
  let domainId = args.find(arg => arg.startsWith("--domain="))?.split("=")[1] ?? args[0];

  if (!domainId) {
    console.error("Usage: node scripts/catalog-build.js --domain=<domainId>");
    process.exit(1);
  }

  console.log(`\n[1/3] 🚀 Starting Data Ingestion for domain: ${domainId}...`);
  await runProcess("scripts/ingest-domain.js", [`--domain=${domainId}`]);

  console.log(`\n[2/3] 📦 Starting Catalog Publishing for domain: ${domainId}...`);
  await runProcess("scripts/publish-catalog.js", [`--domain=${domainId}`]);

  // Only generate SEO pages for supported domains
  if (domainId === "laptop-student-us") {
    console.log(`\n[3/3] 🔍 Generating Programmatic SEO Pages...`);
    await runProcess("scripts/generate-seo-pages.js", []);
  }

  console.log(`\n✅ Build Pipeline successfully completed for ${domainId}.`);
}

run().catch(err => {
  console.error("\n❌ Pipeline failed:", err.message);
  process.exit(1);
});

