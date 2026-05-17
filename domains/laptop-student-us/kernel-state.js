// Singleton: loads decision-config.json, creates compiler/kernel/explainer instances
import { DecisionKernel, DecisionCompiler, DecisionExplainer } from "../../packages/catalog-core/src/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "decision-config.json");
export const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

export const compiler = new DecisionCompiler();
export const kernel = new DecisionKernel();
export const explainer = new DecisionExplainer();
export const decisionIR = compiler.compile(rawConfig);
