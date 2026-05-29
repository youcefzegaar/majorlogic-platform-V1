import { createHash } from "node:crypto";

/**
 * Decision Kernel (DDVM) — Universal Execution Runtime
 *
 * MONEY-BLINDNESS GUARANTEE (M9 gate):
 * This module receives only entity specs and user preferences.
 * Fields that never appear here: priceUsd, affiliate, isAffiliate,
 * commissionRate, buyRoute, seller, vendorTrustScore, platform.
 * Commercial routing runs in commercial-routing/src/index.js, which
 * executes AFTER this kernel finalises and seals the irHash.
 */

function getDeepValue(obj, path) {
  if (typeof path !== "string") return path;
  if (!path.includes(".")) return obj[path];
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

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
          decisionId: createHash("sha256").update(ir.irHash + inputHash).digest("hex"),
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
        values[node.id] = this._evaluateFormula(node.formula, values, trace);
        trace.scores[node.id] = values[node.id];
        break;

      case "gate": {
        const passed = this._evaluateCondition(node.condition, values, trace);
        if (!passed) {
          trace.isEligible = false;
          trace.exclusions.push(node.id);
          trace.sacrifices[node.id] = {
            type: "gate_violation",
            severity: node.weight ?? 1.0,
            meaning: node.humanMeaning || "Critical Constraint"
          };
        }
        break;
      }

      case "score": {
        let score = 0;
        // Weighted sum
        for (const [metric, weight] of Object.entries(node.weights || {})) {
          score += (values[metric] || 0) * weight;
        }

        // Apply penalties (Soft Sacrifices)
        if (node.penalties) {
          for (const [pId, p] of Object.entries(node.penalties)) {
            if (this._evaluateCondition(p.condition, values, trace)) {
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
        if (node.isFinal && values.final_score === undefined) {
          values.final_score = values[node.id];
        }
        break;
      }
    }
  }

  _resolveArg(arg, values, trace = null) {
    if (typeof arg === "number") return arg;
    if (typeof arg === "object") return this._evaluateFormula(arg, values, trace);
    return getDeepValue(values, arg) ?? 0;
  }

  _evaluateFormula(formula, values, trace = null) {
    if (!formula) return 0;

    const resolveArgs = () => {
      const args = (formula.args || []).map(a => this._resolveArg(a, values, trace));
      
      // Validate: all args should be numbers
      for (let i = 0; i < args.length; i++) {
        if (typeof args[i] !== 'number' || isNaN(args[i])) {
          const argDef = formula.args[i];
          this.logger.warn(`[KERNEL] Arg ${i} (${JSON.stringify(argDef)}) resolved to invalid value: ${args[i]}`);
          args[i] = 0; // Safe default
        }
      }
      return args;
    };

    let result;

    try {
      switch (formula.op) {
        case "add":
          result = resolveArgs().reduce((sum, v) => sum + v, 0);
          break;
        case "subtract": {
          const subArgs = resolveArgs();
          result = subArgs.length ? subArgs.reduce((a, b) => a - b) : 0;
          break;
        }
        case "multiply":
          result = resolveArgs().reduce((prod, v) => prod * v, 1);
          break;
        case "min": {
          const minArgs = resolveArgs();
          result = minArgs.length ? Math.min(...minArgs) : 0;
          break;
        }
        case "max": {
          const maxArgs = resolveArgs();
          result = maxArgs.length ? Math.max(...maxArgs) : 0;
          break;
        }
        case "average": {
          const vals = resolveArgs();
          result = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
          break;
        }
        case "clamp": {
          const [val, lo, hi] = resolveArgs();
          result = Math.max(lo, Math.min(hi, val));
          break;
        }
        case "inverse": {
          const v = this._resolveArg(formula.arg, values, trace);
          result = v === 0 ? 0 : 1 / v;
          break;
        }
        default:
          this.logger.error(`[KERNEL] Unknown formula operation: ${formula.op}`);
          result = 0;
      }
    } catch (err) {
      this.logger.error(`[KERNEL] Formula evaluation error:`, err);
      result = 0;
    }

    // Handle NaN/Infinity
    if (!isFinite(result)) {
      this.logger.warn(`[KERNEL] Formula produced invalid result: ${result}. Returning 0.`);
      result = 0;
    }

    // Round to reasonable precision (avoid floating point errors)
    result = Math.round(result * 10000) / 10000;

    if (trace) {
      trace.steps.push({
        formula: formula.op,
        result,
        args: formula.args
      });
    }

    return result;
  }

  _evaluateCondition(cond, values, trace = null) {
    if (!cond) return true;
    
    // Support Logical Operators (Recursive)
    if (cond.op === "or") {
      return (cond.args || []).some(arg => this._evaluateCondition(arg, values, trace));
    }
    if (cond.op === "and") {
      return (cond.args || []).every(arg => this._evaluateCondition(arg, values, trace));
    }
    if (cond.op === "not") {
      return !this._evaluateCondition(cond.arg || cond.args?.[0], values, trace);
    }

    const left = typeof cond.left === "object" ? this._evaluateFormula(cond.left, values, trace) : (getDeepValue(values, cond.left) ?? cond.left);
    const right = typeof cond.right === "object" ? this._evaluateFormula(cond.right, values, trace) : (getDeepValue(values, cond.right) ?? cond.right);

    switch (cond.op) {
      case "gte": return left >= right;
      case "lte": return left <= right;
      case "gt": return left > right;
      case "lt": return left < right;
      case "eq": return left === right;
      case "not_equal": return left !== right;
      case "ne": return left !== right;
      default: return false;
    }
  }
}
