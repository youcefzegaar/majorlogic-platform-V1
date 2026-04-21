import { getRepository } from "./apps/api/src/db/repository.js";
import { getDomainController } from "./apps/api/src/registry.js";
import { loadEnvFile } from "./scripts/env.js";

loadEnvFile(process.cwd() + "/.env");

async function run() {
  const c = getDomainController("laptop-student-us");
  
  // Proper default profile structure
  const defaultProfile = {
    id: "default_seed",
    major: "cs",
    budgetUsd: 1400,
    preferences: { portability: 50, battery: 50, display: 50, resale: 50 },
    sliders: { virtual_machines: 30, video_4k: 20, gaming: 20, portability: 50 },
    context: { acceptsOpenBox: false, acceptsRefurbished: false, financingAllowed: true }
  };

  console.log("Building search state...");
  const params = new URLSearchParams("major=computer_science&budgetUsd=2500");
  const state = c.buildSearchState(params, defaultProfile);
  const profile = state.profile;

  console.log("Running pipeline...");
  const result = await c.runPipeline(profile);
  console.log("Generated Decision ID:", result.decision.decisionRunId);

  if (!result.decision || !result.decision.decisionRunId) {
    console.error("FAIL: No decisionRunId generated!");
    process.exit(1);
  }

  // Allow time for the fire-and-forget background save to complete
  await new Promise(r => setTimeout(r, 1500));
  
  const repo = await getRepository();
  if (!repo) {
    console.error("FAIL: DB not available.");
    process.exit(1);
  }

  // 2. Check Decision Save
  const dbRun = await repo.client.query('SELECT count(*) FROM ml_telemetry.decision_runs');
  console.log(`Runs in ml_telemetry.decision_runs DB branch: ${dbRun.rows[0].count}`);

  // 3. Simulate Telemetry Click
  console.log("Simulating a student click on a recommended laptop...");
  await repo.saveTelemetryClick({ decisionRunId: result.decision.decisionRunId, entityId: "best_laptop_123", clickType: "buy_intent" });
  
  const dbClicks = await repo.client.query('SELECT count(*) FROM ml_telemetry.telemetry_clicks');
  console.log(`Clicks generated: ${dbClicks.rows[0].count}`);

  console.log("✅ E2E Telemetry SUCCESS");
  process.exit(0);
}
run();
