import { DecisionKernel, DecisionCompiler, DecisionExplainer } from "../../packages/catalog-core/src/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "decision-config.json");
const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

const compiler = new DecisionCompiler();
const kernel = new DecisionKernel();
const explainer = new DecisionExplainer({
    atlas: {
        ar: {
            range_miles: "المدى بالكيلومترات",
            range_per_dollar: "كفاءة المدى مقابل السعر",
            charging_kw: "سرعة الشحن",
            performance_index: "قوة الأداء والتسارع",
            legacy_penalty: "تقادم تكنولوجيا الشحن",
            score_family_commuter: "معايير العائلة والتوفير",
            score_performance: "معايير الأداء والسرعة"
        }
    }
});
const decisionIR = compiler.compile(rawConfig);

export const evDomainPack = {
  meta: {
    domainId: "ev-market-us",
    version: "1.0.0",
    identityRules: decisionIR.identityRules
  },

  evaluateCandidate({ profile, entity }) {
    const flattened = {
        ...entity,
        range_miles: entity.specs?.range || 0,
        price: entity.price || 99999,
        accel_0_60: entity.specs?.accel || 10,
        charging_kw: entity.specs?.charging || 50
    };

    const targetScoreId = rawConfig.rulesets[profile.intent] ? `score_${profile.intent}` : "score_family_commuter";

    const kernelResult = kernel.execute(decisionIR, [flattened], {}, { targetScoreId });
    const result = kernelResult.results[0];

    return {
      entity,
      eligible: result.eligible,
      exclusionReasons: result.trace.exclusions,
      score: result.score,
      whyThis: explainer.explain(result.trace, entity.title),
      trace: result.trace
    };
  },

  buildCard(cardType, selection) {
      return {
          cardType,
          title: selection.entity.title,
          price: selection.entity.price,
          explanation: selection.whyThis,
          score: selection.score
      };
  }
};
