import { createHash } from "node:crypto";

/**
 * Decision Kernel (DDVM) — Universal Execution Runtime
 */

export class DecisionKernel {
  constructor(logger = console) {
    this.logger = logger;
  }

  /**
   * Execute a compiled Decision IR on a set of entities.
   */
  execute(ir, entities, context = {}, options = {}) {
    this.logger.log(`[Kernel] Executing IR: ${ir.id} v${ir.version}`);

    const targetScoreId = options.targetScoreId || null;
    const executionPlan = ir.executionPlan;

    return {
      results: entities.map((entity) => {
        // بصمة المدخلات لضمان ثبات البيانات (Input Snapshot Hash)
        const inputHash = createHash("sha256").update(JSON.stringify(entity)).digest("hex");

        const trace = {
          decisionId: createHash("md5").update(ir.irHash + inputHash).digest("hex"),
          irHash: ir.irHash,
          inputHash,
          entityId: entity.entityId || entity.id,
          steps: [],
          exclusions: [],
          scores: {},
          sacrifices: {},
          isEligible: true
        };

        const values = { ...context, ...entity };

        // Execute the pre-compiled, topologically sorted plan
        for (const node of executionPlan) {
          this._executeNode(node, values, trace);
          
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
      })
    };
  }

  _executeNode(node, values, trace) {
    if (!trace.sacrifices) trace.sacrifices = {};

    switch (node.type) {
      case "attribute":
        // Raw values already in 'values'
        break;

      case "derived":
        values[node.id] = this._evaluateFormula(node.formula, values);
        trace.scores[node.id] = values[node.id];
        break;

      case "gate":
        const passed = this._evaluateCondition(node.condition, values);
        if (!passed) {
          trace.isEligible = false;
          trace.exclusions.push(node.id);
          
          // Record as a critical sacrifice if we are tracking them
          trace.sacrifices[node.id] = {
            type: "gate_violation",
            severity: 1.0,
            meaning: node.humanMeaning || "Critical Constraint"
          };
        }
        break;

      case "score":
        let score = 0;
        // Weighted sum
        for (const [metric, weight] of Object.entries(node.weights || {})) {
          score += (values[metric] || 0) * weight;
        }

        // Apply penalties (Soft Sacrifices)
        if (node.penalties) {
          for (const [pId, p] of Object.entries(node.penalties)) {
            if (this._evaluateCondition(p.condition, values)) {
              score -= p.amount;
              trace.steps.push({ 
                  type: "penalty", 
                  node: node.id, 
                  penalty: p.amount, 
                  reason: p.reason 
              });

              // Record sacrifice
              this.logger.log(`[Kernel] Recording sacrifice for: ${pId} (${p.reason})`);
              trace.sacrifices[pId] = {
                type: "soft_sacrifice",
                severity: p.amount / 100,
                meaning: p.reason || pId
              };
            }
          }
        }

        values[node.id] = Math.max(0, Math.min(100, score));
        trace.scores[node.id] = values[node.id];
        if (node.isFinal && !values.final_score) {
          values.final_score = values[node.id];
        }
        break;
    }
  }

  _resolveArg(arg, values) {
    if (typeof arg === "number") return arg;
    if (typeof arg === "object") return this._evaluateFormula(arg, values);
    return values[arg] || 0;
  }

  _evaluateFormula(formula, values) {
    if (!formula) return 0;
    
    const resolveArgs = () => (formula.args || []).map(a => this._resolveArg(a, values));

    switch (formula.op) {
      case "add":
        return resolveArgs().reduce((sum, v) => sum + v, 0);
      case "subtract":
        const subArgs = resolveArgs();
        return subArgs.length ? subArgs.reduce((a, b) => a - b) : 0;
      case "multiply":
        return resolveArgs().reduce((prod, v) => prod * v, 1);
      case "min":
        return Math.min(...resolveArgs());
      case "max":
        return Math.max(...resolveArgs());
      case "average": {
        const vals = resolveArgs();
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      }
      case "clamp": {
        // args: [value, min, max]
        const [val, lo, hi] = resolveArgs();
        return Math.max(lo, Math.min(hi, val));
      }
      case "inverse": {
        const v = this._resolveArg(formula.arg, values);
        return v === 0 ? 0 : 1 / v;
      }
      default:
        return 0;
    }
  }

  _evaluateCondition(cond, values) {
    if (!cond) return true;
    const left = typeof cond.left === "object" ? this._evaluateFormula(cond.left, values) : (values[cond.left] || cond.left);
    const right = typeof cond.right === "object" ? this._evaluateFormula(cond.right, values) : (values[cond.right] || cond.right);

    switch (cond.op) {
      case "gte": return left >= right;
      case "lte": return left <= right;
      case "gt": return left > right;
      case "lt": return left < right;
      case "eq": return left === right;
      default: return false;
    }
  }
}
