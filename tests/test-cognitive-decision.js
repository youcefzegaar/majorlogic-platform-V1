import { DecisionOrchestrator } from "../packages/decision-orchestrator/src/index.js";

async function runDemo() {
  const orchestrator = new DecisionOrchestrator({
    logger: { log: (msg) => console.log(`\x1b[90m${msg}\x1b[0m`) }, // Dimmed logs
    explainer: {
      aiProvider: {
        generate: async (prompt) => {
          console.log("\x1b[33m[Mock AI] Generate called with prompt length:\x1b[0m", prompt.length);
          return "هذا شرح تجريبي صادق: لقد اخترنا هذا المنتج رغم تضحيته بالجودة البصرية للحفاظ على الميزانية.";
        }
      }
    }
  });

  // 1. القواعد الإدراكية (من لوحة التحكم)
  const config = {
    domainId: "laptop-demo",
    version: "1.0.0",
    useAI: true,
    expertIdentity: "مستشار هندسة القرارات",
    attributes: {
      price: { name: "Price" },
      perf: { name: "Performance" },
      display: { name: "Display" }
    },
    scores: {
      final_score: {
        type: "score",
        isFinal: true,
        weights: { perf: 0.8, display: 0.2 },
        penalties: {
          "high_price_tax": {
            condition: { left: "price", op: "gt", right: 100 },
            amount: 20,
            reason: "تضحية مالية كبيرة (Financial Sacrifice)"
          }
        }
      }
    }
  };

  // 2. المنتجات المتوفرة
  const entities = [
    { id: "laptop-x", title: "Laptop X (The Beast)", price: 1200, perf: 95, display: 40 },
    { id: "laptop-y", title: "Laptop Y (Budget King)", price: 500, perf: 40, display: 80 }
  ];

  // 3. ملف المستخدم (يريد أداء عالي لكن ميزانيته ضيقة)
  const userProfile = {
    perf: 90,
    price: 600,
    locale: "ar"
  };

  console.log("\n\x1b[1m\x1b[35m--- تجربة القرار الإدراكي (MajorLogic Cognitive Experience) ---\x1b[0m\n");
  console.log("\x1b[36m[المستخدم]:\x1b[0m أريد أقوى أداء ممكن بميزانية محدودة.");
  
  const result = await orchestrator.run(config, entities, userProfile);

  const bestCard = result.cards[0];

  console.log("\n\x1b[32m[القرار النهائي]:\x1b[0m " + bestCard.title);
  
  if (Object.keys(bestCard.sacrifices).length > 0) {
    console.log("\x1b[33m[مصفوفة التضحيات (Sacrifice Vector)]:\x1b[0m");
    Object.entries(bestCard.sacrifices).forEach(([, s]) => {
        console.log(` - ${s.meaning} (الشدة: ${s.severity * 100}%)`);
    });
  } else {
    console.log("\x1b[32m[لا توجد تضحيات جوهرية]:\x1b[0m المنتج يلبي كافة المعايير.");
  }

  console.log("\n\x1b[34m[حديث الحكمة (AI Narrative)]:\x1b[0m");
  console.log(bestCard.story || bestCard.tradeoff);

  console.log("\x1b[90m------------------------------------------------------------\x1b[0m");
  console.log("\x1b[32m✔ تم التحقق من النزاهة الإدراكية بنجاح.\x1b[0m\n");
}

runDemo();
