import { DecisionKernel } from "../packages/decision-kernel/src/index.js";

const kernel = new DecisionKernel();

// ---------------------------------------------------------
// 1. تجربة دومين اللابتوبات (Laptop Lite IR)
// ---------------------------------------------------------
const laptopIR = {
  id: "laptop-student-v1",
  version: "1.0.0",
  nodes: [
    { id: "within_budget", type: "CONSTRAINT", condition: { op: "lte", left: "price", right: "budget" }, reason: "Over Budget" },
    { id: "portability", type: "DERIVE", formula: { op: "add", args: ["battery", { op: "multiply", args: ["weight", -5] }] } },
    { id: "final_score", type: "SCORE", inputs: { portability: 0.6, performance: 0.4 }, isFinal: true },
    { id: "thermal_penalty", type: "PENALTY", condition: { op: "gt", left: "heat_score", right: 80 }, amount: 15, reason: "High Thermals" }
  ]
};

const laptopData = [
  { id: "macbook", price: 999, battery: 95, weight: 1.2, performance: 90, heat_score: 40 },
  { id: "gaming-beast", price: 1500, battery: 40, weight: 2.5, performance: 98, heat_score: 85 }
];

const laptopContext = { budget: 1200 };

console.log("\n=== [SPIKE 1] Domain: Laptops ===");
const laptopResult = kernel.execute(laptopIR, laptopData, laptopContext);
console.log(JSON.stringify(laptopResult, null, 2));

// ---------------------------------------------------------
// 2. تجربة دومين "الخوادم" (B2B Servers IR) - اختبار الشمولية
// ---------------------------------------------------------
const serverIR = {
  id: "b2b-server-procurement",
  version: "1.0.0",
  nodes: [
    { id: "sla_gate", type: "CONSTRAINT", condition: { op: "gte", left: "uptime_sla", right: 99.9 }, reason: "Unreliable SLA" },
    { id: "compute_density", type: "DERIVE", formula: { op: "add", args: ["cores", "ram"] } },
    { id: "efficiency_score", type: "SCORE", inputs: { compute_density: 0.7, power_efficiency: 0.3 }, isFinal: true }
  ]
};

const serverData = [
  { id: "proliant-gen11", uptime_sla: 99.99, cores: 64, ram: 128, power_efficiency: 85 },
  { id: "budget-server", uptime_sla: 98.5, cores: 32, ram: 64, power_efficiency: 70 }
];

const serverContext = {};

console.log("\n=== [SPIKE 2] Domain: B2B Servers (Hostile Domain Test) ===");
const serverResult = kernel.execute(serverIR, serverData, serverContext);
console.log(JSON.stringify(serverResult, null, 2));
