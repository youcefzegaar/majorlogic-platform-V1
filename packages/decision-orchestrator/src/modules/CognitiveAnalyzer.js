/**
 * Cognitive Analyzer
 * Analyzes conflicts, compromises, and overall confidence in the current profile constraint setup.
 */
export class CognitiveAnalyzer {
  constructor(logger = console) {
    this.logger = logger;
  }

  analyze(userProfile, config) {
    let conflictScore = 0;
    const conflicts = [];
    const conflictMap = config.conflictMap || {};

    for (const [pair, penalty] of Object.entries(conflictMap)) {
      const [a, b] = pair.split(':');
      const valA = userProfile[a] || 0;
      const valB = userProfile[b] || 0;

      // Graded intensity: The conflict score scales with the intensity of both competing demands.
      const intensity = (valA / 100) * (valB / 100) * penalty;
      
      if (intensity > 0) {
        conflictScore += intensity;
        conflicts.push({ pair, a, b, penalty, intensity });
        this.logger.log(`[CognitiveAnalyzer] Conflict intensity for ${pair}: ${intensity.toFixed(2)}`);
      }
    }

    // A higher conflict score reduces confidence
    const finalScore = Math.max(0, 100 - conflictScore);
    
    return {
        level: conflictScore > 50 ? "low" : conflictScore > 20 ? "medium" : "high",
        score: finalScore,
        conflicts
    };
  }
}
