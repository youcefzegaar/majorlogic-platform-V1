import { DecisionOrchestrator } from "../packages/decision-orchestrator/src/index.js";

// Mock Logger
const silentLogger = { log: () => {}, error: console.error };

// Mock AI Provider with Logger to see the "Cognitive Prompt"
const mockAIProvider = {
    generate: async (prompt) => {
        console.log("\n--- [🚀 COGNITIVE PROMPT SENT TO AI] ---");
        console.log(prompt);
        console.log("-----------------------------------------\n");
        return "This is a simulated expert narrative based on the cognitive state.";
    }
};

const laptopConfig = {
  domainId: "laptop-student-us",
  version: "3.0.0",
  useAI: true, // Trigger the AI Renderer
  expertIdentity: "Senior Tech Consultant",
  defaultLocale: "en",
  
  atlas: {
    en: {
        within_budget: "your budget limit",
        min_ram: "required multitasking capacity (RAM)",
        performance: "processing speed",
        reason_weight: "is too heavy for your nomadic lifestyle",
        reason_budget: "is slightly beyond your specified budget",
        tradeoff_weight: "It's a powerhouse, but heavy in your backpack."
    }
  },

  // ── INTENT GRAPH ──
  intentGraph: {
    creative_nomad: {
      title: "Creative Nomad",
      expertIdentity: "Lifestyle Designer",
      futureProjection: "As you grow in your design career, you might find the screen size limiting for complex timelines.",
      gates: {
        gate_weight: { node: "weight_limit", condition: { op: "lte", left: "weightKg", right: 1.5 } }
      }
    }
  },

  // ── CONFLICT MAP ──
  conflictMap: {
    "performance:portability": 45,
    "budget:power": 30
  },

  profileMapping: {
    budget: "max_price"
  },

  gates: {
    gate_budget: { node: "within_budget", condition: { op: "lte", left: "price", right: "max_price" } }
  },

  scores: {
    score_general: {
      weights: { benchmarkScore: 1.0 },
      isFinal: true
    }
  },

  selectionStrategy: {
    cardSlots: [{ type: "hero", pickBy: "highest_score" }],
    noDuplicates: true
  },

  outputTemplate: {
    whyThis: "{story}",
    tradeoff: "{tradeoff}"
  }
};

const entities = [
  { id: "mbp-14", entityId: "mbp-14", title: "MacBook Pro 14", price: 1999, weightKg: 1.6, benchmarkScore: 92 },
  { id: "mba-13", entityId: "mba-13", title: "MacBook Air 13", price: 1099, weightKg: 1.2, benchmarkScore: 75 },
  { id: "xps-15", entityId: "xps-15", title: "Dell XPS 15", price: 1599, weightKg: 2.0, benchmarkScore: 85 }
];

const userProfile = {
  id: "user-456",
  budget: 2000,
  intentId: "creative_nomad",
  performance: 85,  // User wants high performance
  portability: 90,  // AND high portability (CONFLICT!)
  locale: "en"
};

async function runTest() {
    console.log("╔══════════════════════════════════════════════════╗");
    console.log("║  UNIVERSAL ORCHESTRATOR — Intent Graph Test      ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    const orchestrator = new DecisionOrchestrator({ 
        logger: silentLogger,
        explainer: { aiProvider: mockAIProvider }
    });
    const result = await orchestrator.run(laptopConfig, entities, userProfile);

    console.log(`Status: ${result.status}`);
    console.log(`Resolved Intent: ${result.intentId}`);
    console.log(`Confidence: ${result.confidence.score}% (${result.confidence.level})`);
    
    if (result.confidence.conflicts.length > 0) {
        console.log(`⚠️ Conflicts Detected: ${result.confidence.conflicts.map(c => c.pair).join(", ")}`);
    }

    console.log(`\n── [1] WINNERS ──`);
    for (const card of result.cards) {
      console.log(`\n  [${card.cardType.toUpperCase()}] ${card.title}`);
      console.log(`  Expert (${result.cards[0].cardType === "hero" ? "Lifestyle Designer" : ""}): ${card.whyThis}`);
    }

    console.log(`\n── [2] TRANSPARENCY ──`);
    for (const ex of result.topExcludedStories) {
      console.log(`  - ${ex.title}: ${ex.reason}`);
    }

    console.log("\n── Assertions ──");
    let allPassed = true;
    const check = (name, condition) => {
      if (condition) console.log(`  ✅ ${name}`);
      else { console.log(`  ❌ ${name}`); allPassed = false; }
    };

    check("Intent 'creative_nomad' resolved", result.intentId === "creative_nomad");
    check("Conflict detected (Performance vs Portability)", result.confidence.score < 100);
    check("XPS 15 excluded due to weight (Nomad constraint)", result.topExcludedStories.some(s => s.entityId === "xps-15" && s.reason.includes("heavy")));

    console.log(`\n══════════════════════════════════════════════════`);
    console.log(`  ${allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌"}`);
    console.log(`══════════════════════════════════════════════════`);
    if (!allPassed) process.exit(1);
}

runTest().catch(err => {
    console.error(err);
    process.exit(1);
});
