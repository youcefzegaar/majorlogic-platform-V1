/**
 * Decision Kernel (DDVM) — Universal Decision Execution Engine
 *
 * الغرض: تنفيذ الرسوم البيانية للقرار (Decision IR) بشكل محايد وشامل.
 * المبدأ: البيانات + المعرفة (IR) = قرار + تتبع سببي.
 */

export class DecisionKernel {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.version = "0.1.0-spike";
  }

  /**
   * تنفيذ رسم بياني للقرار على مجموعة من الكيانات.
   */
  execute(ir, entities, context = {}, options = {}) {
    this.logger.log(`[Kernel] Executing IR: ${ir.id} v${ir.version}`);

    const targetScoreId = options.targetScoreId || null;
    const sortedNodes = this._sortNodes(ir.nodes);

    const results = entities.map((entity) => {
      const trace = {
        entityId: entity.entityId || entity.id,
        steps: [],
        exclusions: [],
        scores: {},
        finalScore: 0,
        isEligible: true
      };

      const values = { ...context, ...entity };

      for (const node of sortedNodes) {
        this._executeNode(node, values, trace);
        // إذا كان هناك هدف محدد للتقييم، نستخدمه كـ final_score
        if (targetScoreId && node.id === targetScoreId) {
            values.final_score = values[node.id];
        }
      }

      return {
        entityId: trace.entityId,
        score: values.final_score || 0,
        eligible: trace.isEligible,
        trace
      };
    });

    return {
      runId: crypto.randomUUID(),
      irId: ir.id,
      timestamp: new Date().toISOString(),
      results: results.sort((a, b) => b.score - a.score)
    };
  }

  /**
   * ترتيب العقد لضمان تنفيذ الاعتمادات أولاً.
   * خوارزمية مبسطة للـ Spike: نستخدم Topological Sort مستقبلاً.
   */
  _sortNodes(nodes) {
    // حالياً نكتفي بالترتيب حسب النوع (Derive -> Constraint -> Score -> Penalty)
    // هذا يكفي لمعظم الحالات البسيطة في الدومين الحالي
    const order = { DERIVE: 1, CONSTRAINT: 2, SCORE: 3, PENALTY: 4 };
    return [...nodes].sort((a, b) => (order[a.type] || 99) - (order[b.type] || 99));
  }

  _executeNode(node, values, trace) {
    switch (node.type) {
      case "DERIVE":
        values[node.id] = this._evaluateFormula(node.formula, values);
        trace.steps.push({ node: node.id, val: values[node.id], type: "derive" });
        break;

      case "CONSTRAINT":
        const passed = this._evaluateCondition(node.condition, values);
        if (!passed) {
          trace.isEligible = false;
          trace.exclusions.push(node.reason || node.id);
        }
        trace.steps.push({ node: node.id, passed, type: "constraint" });
        break;

      case "SCORE":
        const score = this._calculateWeightedScore(node.inputs, values);
        values[node.id] = score;
        trace.scores[node.id] = score;
        if (node.isFinal) values.final_score = score;
        break;

      case "PENALTY":
        if (this._evaluateCondition(node.condition, values)) {
          const penalty = node.amount || 0;
          values.final_score = (values.final_score || 0) - penalty;
          trace.steps.push({ node: node.id, penalty, type: "penalty", reason: node.reason });
        }
        break;
    }
  }

  _evaluateFormula(formula, values) {
    if (formula.op === "add") {
      return formula.args.reduce((sum, arg) => sum + (typeof arg === "number" ? arg : (values[arg] || 0)), 0);
    }
    if (formula.op === "multiply") {
      return formula.args.reduce((prod, arg) => prod * (typeof arg === "number" ? arg : (values[arg] || 1)), 1);
    }
    if (formula.op === "inverse") {
      const val = typeof formula.arg === "number" ? formula.arg : (values[formula.arg] || 1);
      return val === 0 ? 0 : 1 / val;
    }
    return 0;
  }

  _evaluateCondition(condition, values) {
    const left = typeof condition.left === "number" ? condition.left : (values[condition.left] ?? 0);
    const right = typeof condition.right === "number" ? condition.right : (values[condition.right] ?? 0);

    switch (condition.op) {
      case "lte": return left <= right;
      case "gte": return left >= right;
      case "eq":  return left === right;
      case "gt":  return left > right;
      case "lt":  return left < right;
      default: return false;
    }
  }

  _calculateWeightedScore(inputs, values) {
    return Object.entries(inputs).reduce((total, [key, weight]) => {
      const val = values[key] || 0;
      return total + (val * weight);
    }, 0);
  }
}
