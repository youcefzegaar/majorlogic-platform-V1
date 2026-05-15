/**
 * Recovery Engine
 * Implements Relaxation Algorithms to recover from Zero-Result scenarios.
 */
export class RecoveryEngine {
  constructor(kernel, logger = console) {
    this.kernel = kernel;
    this.logger = logger;
  }

  attemptRecovery(ir, entities, mappedProfile, excluded) {
    // 1. Find the most restrictive constraint (the bottleneck)
    const gateCounts = {};
    for (const ex of excluded) {
      for (const gate of ex.trace.exclusions) {
        gateCounts[gate] = (gateCounts[gate] || 0) + 1;
      }
    }

    if (Object.keys(gateCounts).length === 0) return null;

    const mostCommonGate = Object.keys(gateCounts).sort((a, b) => gateCounts[b] - gateCounts[a])[0];

    // 2. Create a modified IR plan without this gate
    const relaxedPlan = ir.executionPlan.filter(node => node.id !== mostCommonGate);
    const relaxedIr = { ...ir, executionPlan: relaxedPlan };

    // 3. Re-execute Kernel with relaxed rules
    const execution = this.kernel.execute(relaxedIr, entities, mappedProfile);
    const eligible = execution.results.filter(r => r.eligible);
    const excludedNew = execution.results.filter(r => !r.eligible);

    if (eligible.length > 0) {
        // Recovery Integrity Score - dynamically calculated based on gate importance (weight)
        const gateNode = ir.executionPlan.find(n => n.id === mostCommonGate);
        
        // If a gate has a weight of 1.0 (Absolute), we lose 100% integrity (impossible to recover ethically)
        // If it has 0.5, we lose 50% integrity.
        const gateWeight = gateNode?.weight ?? 0.5;
        const integrityScore = Math.round(100 * (1 - gateWeight));

        return { 
          execution, 
          eligible, 
          excluded: excludedNew, 
          relaxedGateId: mostCommonGate,
          integrityScore 
        };
    }

    return null; // Even with relaxation, no results
  }
}
