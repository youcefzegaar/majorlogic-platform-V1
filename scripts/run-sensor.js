import fs from "node:fs/promises";
import path from "node:path";
import { runStandardsSensor } from "../packages/standards-sensor/src/index.js";
import { loadEnvFile } from "./env.js";

loadEnvFile();

async function run() {
  const args = process.argv.slice(2);
  let domainId = args.find(arg => arg.startsWith("--domain="))?.split("=")[1] ?? args[0];

  if (!domainId) {
    console.error("Usage: node scripts/run-sensor.js --domain=<domainId>");
    process.exit(1);
  }

  const sensorConfigPath = path.resolve(`domains/${domainId}/sensor-config.json`);
  const currentContextsPath = path.resolve(`rulesets/domains/${domainId}/fit-contexts.json`);
  
  let sensorConfig, currentFitContexts;
  try {
    const rawSensor = await fs.readFile(sensorConfigPath, "utf8");
    sensorConfig = JSON.parse(rawSensor);
    const rawContexts = await fs.readFile(currentContextsPath, "utf8");
    currentFitContexts = JSON.parse(rawContexts);
  } catch (err) {
    console.error(`Failed to load config files for domain ${domainId}:`, err.message);
    process.exit(1);
  }

  const report = await runStandardsSensor({ domainId, sensorConfig, currentFitContexts });

  if (report.updatesCount > 0) {
    if (sensorConfig.automationMode === "auto") {
      console.log(`\n🚨 AUTOMATION MODE ACTIVE. Applying changes directly to production configurations...`);
      await fs.writeFile(currentContextsPath, JSON.stringify(report.proposedManifest, null, 2));
      console.log(`✅ Production file rewritten: ${currentContextsPath}`);
      
      console.log(`🚀 Waking up Catalog Builder to sync market devices with new standards...`);
      const { spawn } = await import("node:child_process");
      const buildProc = spawn("node", ["scripts/catalog-build.js", `--domain=${domainId}`], { stdio: "inherit" });
      
      buildProc.on("close", (code) => {
        if (code === 0) {
          console.log(`\n🎉 [AUTONOMOUS CYCLE COMPLETE] Standard was raised and catalog republished autonomously!`);
        } else {
          console.error(`\n❌ Autonomous build crashed with code ${code}.`);
        }
      });
    } else {
      const generatedDir = path.resolve(`domains/${domainId}/generated`);
      await fs.mkdir(generatedDir, { recursive: true });
      
      const outPath = path.join(generatedDir, "fit-contexts-proposal.json");
      await fs.writeFile(outPath, JSON.stringify(report.proposedManifest, null, 2));
      
      console.log(`\n🎉 Sensor completed. Changes proposed: ${report.updatesCount}`);
      console.log(`📂 Draft saved to: ${outPath}`);
      console.log(`👉 Review the draft. If approved, overwrite 'rulesets/domains/${domainId}/fit-contexts.json' with it to upgrade your engine!`);
    }
  } else {
    console.log(`\n🎉 Sensor completed. No updates necessary. Your engine stays current.`);
  }
}

run().catch(err => {
  console.error("Sensor failed:", err);
  process.exit(1);
});
