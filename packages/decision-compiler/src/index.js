import { createHash } from "node:crypto";
import { DECISION_TYPES, OPERATOR_REGISTRY, inferType } from "./types.js";
import { DomainConfigSchema } from "./schema.js";

export class DecisionCompiler {
  constructor(logger = console) {
    this.logger = logger;
  }

  compile(config) {
    this.logger.log(`[Compiler] Validating and Compiling domain: ${config.domainId}`);

    // Pass 0: Strict Schema Validation
    const validation = DomainConfigSchema.safeParse(config);
    if (!validation.success) {
      this.logger.error(`[Compiler] Validation Error: ${validation.error.message}`);
      throw new Error(`Invalid Domain Configuration: ${validation.error.message}`);
    }

    // Pass 1: Symbol Extraction & Node Building
    const nodes = this._buildNodes(validation.data);

    // Pass 2: Explicit Dependency Discovery
    this._extractDependencies(nodes);

    // Pass 3: Topological Sort & Cycle Detection
    const executionPlan = this._buildExecutionPlan(nodes);

    // Pass 4: Semantic Type Checking & Inference
    this._typeCheckPass(executionPlan);

    // Pass 5: Semantic Validation
    this._validateGraph(nodes, executionPlan);

    // Pass 6: Generate IR Hash for Version Locking
    const irContent = JSON.stringify({
        nodes: executionPlan,
        identityRules: config.identityRules || {}
    });
    const irHash = createHash("sha256").update(irContent).digest("hex");

    return {
      id: config.domainId,
      irHash, // بصمة المنطق لضمان التتبع التاريخي
      version: config.version || "1.0.0",
      compiledAt: new Date().toISOString(),
      identityRules: config.identityRules || {},
      executionPlan: executionPlan.map(n => Object.freeze(n))
    };
  }

  _buildNodes(config) {
    const nodes = [];

    // 1. Attributes (Inputs)
    if (config.attributes) {
      for (const [id, attr] of Object.entries(config.attributes)) {
        nodes.push({ ...attr, id, type: "attribute" });
      }
    }

    // 2. Metrics (Derived)
    if (config.metrics) {
      for (const [id, metric] of Object.entries(config.metrics)) {
        nodes.push({ id, type: "derived", ...metric });
      }
    }

    // 3. Gates (Constraints)
    if (config.gates) {
      for (const [id, gate] of Object.entries(config.gates)) {
        nodes.push({ id, type: "gate", ...gate });
      }
    }

    // 4. Rulesets (Scoring)
    if (config.rulesets) {
      for (const [id, ruleset] of Object.entries(config.rulesets)) {
        nodes.push({ 
            id: `score_${id}`, 
            type: "score", 
            weights: ruleset.weights, 
            penalties: ruleset.penalties,
            isFinal: ruleset.isDefault || false 
        });
      }
    }

    // 3. Scores (Aggregated — from direct config.scores)
    if (config.scores) {
      for (const [id, score] of Object.entries(config.scores)) {
        nodes.push({ id, type: "score", ...score });
      }
    }

    return nodes;
  }

  _extractDependencies(nodes) {
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const node of nodes) {
      const deps = new Set();

      if (node.formula) this._findSymbols(node.formula, deps);
      if (node.condition) this._findSymbols(node.condition, deps);
      
      if (node.penalties) {
          Object.values(node.penalties).forEach(p => this._findSymbols(p.condition, deps));
      }

      if (node.weights) {
          Object.keys(node.weights).forEach(w => deps.add(w));
      }

      // Filter out symbols that are not defined as nodes (external context like 'budget' or 'major')
      node.dependsOn = Array.from(deps).filter(d => nodeIds.has(d));
    }
  }

  _findSymbols(obj, found) {
    if (!obj) return;
    if (typeof obj === "string") {
        found.add(obj);
        return;
    }
    if (typeof obj !== "object") return;
    
    if (obj.arg) this._findSymbols(obj.arg, found);
    if (obj.left) this._findSymbols(obj.left, found);
    if (obj.right) this._findSymbols(obj.right, found);
    if (obj.args) obj.args.forEach(a => this._findSymbols(a, found));
  }

  _buildExecutionPlan(nodes) {
    const plan = [];
    const inDegree = {};
    const adj = {};
    const nodeMap = {};

    nodes.forEach(n => {
      nodeMap[n.id] = n;
      inDegree[n.id] = 0;
      adj[n.id] = [];
    });

    nodes.forEach(n => {
      n.dependsOn.forEach(dep => {
        adj[dep].push(n.id);
        inDegree[n.id]++;
      });
    });

    const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);

    while (queue.length > 0) {
      const u = queue.shift();
      plan.push(nodeMap[u]);

      adj[u].forEach(v => {
        inDegree[v]--;
        if (inDegree[v] === 0) queue.push(v);
      });
    }

    if (plan.length !== nodes.length) {
      throw new Error("CRITICAL: Cycle detected in Decision Graph. Execution is impossible.");
    }

    return plan;
  }

  _typeCheckPass(plan) {
    const nodeMap = {};
    plan.forEach(n => nodeMap[n.id] = n);

    for (const node of plan) {
      node.resultType = inferType(node, nodeMap);
      
      const checkOperator = (opId, args) => {
          const op = OPERATOR_REGISTRY[opId];
          if (!op) return;

          const inputTypes = args.map(arg => {
              // If it's a string, it's a node reference
              if (typeof arg === "string") {
                  return nodeMap[arg]?.resultType || DECISION_TYPES.NUMERIC;
              }
              // If it's a number, it's a numeric literal
              if (typeof arg === "number") return DECISION_TYPES.NUMERIC;
              return DECISION_TYPES.NUMERIC;
          });
          
          // 1. Base Types Check
          const inputErrors = inputTypes.filter(t => !op.accepts.includes(t));
          if (inputErrors.length > 0) {
              throw new Error(`CONTRACT VIOLATION: Node '${node.id}' uses '${opId}' with unsupported types: [${inputErrors.join(", ")}]. Accepted: [${op.accepts.join(", ")}]`);
          }

          // 2. Semantic Validation
          const validation = op.validate(inputTypes);
          if (!validation.valid) {
              throw new Error(`SEMANTIC CONTRACT VIOLATION: Node '${node.id}' failed '${op.name}' contract check: ${validation.error}`);
          }
      };

      if (node.formula) {
          checkOperator(node.formula.op, node.formula.args || []);
      }
      
      if (node.condition) {
          checkOperator(node.condition.op, [node.condition.left, node.condition.right]);
      }
      
      this.logger.log(`[Compiler] Inferred type for '${node.id}': ${node.resultType}`);
    }
  }

  _validateGraph(nodes, plan) {
    // Basic validation for now
    if (nodes.length > 0 && plan.length === 0) {
        throw new Error("Compiler Error: Failed to generate execution plan.");
    }
  }
}
