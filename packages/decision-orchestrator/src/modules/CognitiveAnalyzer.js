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
      // A conflict exists if both competing dimensions are demanded heavily (e.g., high performance AND high portability)
      if (userProfile[a] > 70 && userProfile[b] > 70) {
        conflictScore += penalty;
        conflicts.push({ pair, a, b, penalty });
        this.logger.log(`[CognitiveAnalyzer] Conflict Detected: ${pair} (+${penalty} cognitive penalty)`);
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
