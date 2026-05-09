import { DECISION_TYPES, OPERATOR_REGISTRY, inferType } from "./types.js";

export class DecisionCompiler {
  constructor(logger = console) {
    this.logger = logger;
  }

  compile(config) {
    this.logger.log(`[Compiler] Compiling domain: ${config.domainId}`);

    // Pass 1: Symbol Extraction & Node Building
    const nodes = this._buildNodes(config);

    // Pass 2: Explicit Dependency Discovery
    this._extractDependencies(nodes);

    // Pass 3: Topological Sort & Cycle Detection
    const executionPlan = this._buildExecutionPlan(nodes);

    // Pass 4: Semantic Type Checking & Inference
    this._typeCheckPass(executionPlan);

    // Pass 5: Semantic Validation
    this._validateGraph(nodes, executionPlan);

    return {
      id: config.domainId,
      version: config.version || "1.0.0",
      compiledAt: new Date().toISOString(),
      identityRules: config.identityRules || {},
      executionPlan: executionPlan.map(n => Object.freeze(n)) // Make IR Immutable
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
      
      if (node.formula) {
        const op = OPERATOR_REGISTRY[node.formula.op];
        if (op) {
            const inputTypes = (node.dependsOn || []).map(id => nodeMap[id]?.resultType);
            
            // Check if inputs match operator requirements
            const isValid = inputTypes.every(t => op.accepts.includes(t));
            if (!isValid) {
                throw new Error(`TYPE MISMATCH: Node '${node.id}' uses operator '${node.formula.op}' with incompatible input types: [${inputTypes.join(", ")}]`);
            }

            // Check semantic validation (e.g., Dimensional Safety for 'add')
            if (op.validate && !op.validate(inputTypes)) {
                throw new Error(`SEMANTIC ERROR: Node '${node.id}' attempts to combine incompatible dimensions: [${inputTypes.join(", ")}]`);
            }
        }
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
