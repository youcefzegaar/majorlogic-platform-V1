/**
 * Decision Compiler — Transforming Declarative Configs into Decision IR
 *
 * الغرض: تحويل ملفات الدومين (YAML/JSON) إلى رسم بياني تنفيذي (Decision IR).
 * المراحل: Parsing -> Validation -> Dependency Resolution -> IR Emission.
 */

export class DecisionCompiler {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  /**
   * ترجمة إعدادات الدومين إلى IR.
   *
   * @param {object} config - إعدادات الدومين الخام
   * @returns {object} Decision IR جاهز للتنفيذ
   */
  compile(config) {
    this.logger.log(`[Compiler] Compiling domain: ${config.domainId}`);

    const nodes = [];

    // 1. تحويل الـ Attributes (Inputs)
    // في الـ IR المتقدم، الـ Inputs هي مجرد مرجع للبيانات الخام

    // 2. تحويل الـ Derived Metrics
    if (config.metrics) {
      for (const [id, metric] of Object.entries(config.metrics)) {
        nodes.push({
          id,
          type: "DERIVE",
          formula: metric.formula,
          metadata: {
            label: metric.label,
            category: metric.category
          }
        });
      }
    }

    // 3. تحويل الـ Constraints (Gates)
    if (config.gates) {
      for (const [id, gate] of Object.entries(config.gates)) {
        nodes.push({
          id,
          type: "CONSTRAINT",
          condition: gate.condition,
          reason: gate.reason
        });
      }
    }

    // 4. تحويل الـ Rulesets (Scoring)
    // في الـ IR، الـ Ruleset هو مجرد Scoring Node
    if (config.rulesets) {
      for (const [id, ruleset] of Object.entries(config.rulesets)) {
        nodes.push({
          id: `score_${id}`,
          type: "SCORE",
          inputs: ruleset.weights,
          isFinal: ruleset.isDefault || false,
          metadata: {
            profile: id
          }
        });

        // إضافة الـ Penalties المرتبطة بالـ Ruleset
        if (ruleset.penalties) {
          for (const [pId, penalty] of Object.entries(ruleset.penalties)) {
            nodes.push({
              id: `${id}_penalty_${pId}`,
              type: "PENALTY",
              condition: penalty.condition,
              amount: penalty.amount,
              reason: penalty.reason
            });
          }
        }
      }
    }

    // 5. التحقق من الصحة (Semantic Validation)
    this._validateGraph(nodes);

    return {
      id: config.domainId,
      version: config.version || "1.0.0",
      compiledAt: new Date().toISOString(),
      identityRules: config.identityRules || {}, // إضافة قواعد الهوية
      nodes
    };
  }

  _validateGraph(nodes) {
    const ids = new Set(nodes.map(n => n.id));
    
    // التحقق من تكرار الـ IDs
    if (ids.size !== nodes.length) {
      throw new Error("Duplicate node IDs detected in domain config.");
    }

    // هنا يمكن إضافة التحقق من الحلقات المفرغة (Circular Dependency)
    // عبر بناء Adjacency List وتشغيل DFS.
  }
}
