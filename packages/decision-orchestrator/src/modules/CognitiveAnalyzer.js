/**
 * Cognitive Analyzer
 * Analyzes conflicts and overall confidence in the current profile constraint setup.
 *
 * conflictMap entries support two formats:
 *   Legacy:  "performance:battery": 60
 *   Current: "performance:battery": { correlation: 0.60, confidence: 0.84, trend: "stable", sample_period: "..." }
 *
 * The current format treats correlations as market-observed hypotheses with a
 * confidence level and trend direction — not as fixed physical laws.
 */
export class CognitiveAnalyzer {
  constructor(logger = console) {
    this.logger = logger;
  }

  analyze(userProfile, config) {
    let conflictScore = 0;
    const conflicts = [];
    const conflictMap = config.conflictMap || {};

    for (const [pair, entry] of Object.entries(conflictMap)) {
      const [a, b] = pair.split(':');
      const valA = userProfile[a] || 0;
      const valB = userProfile[b] || 0;

      // Support both formats: number (legacy) and object (current)
      const isObject = typeof entry === 'object' && entry !== null;
      const penalty     = isObject ? (entry.correlation ?? 0) * 100 : entry;
      const confidence  = isObject ? (entry.confidence ?? 0.8)      : 0.8;
      const trend       = isObject ? (entry.trend ?? 'stable')       : 'stable';
      const samplePeriod = isObject ? (entry.sample_period ?? null)  : null;

      // Graded intensity: scales with the intensity of both competing demands.
      // Confidence-weighted: a less certain correlation contributes less to the score.
      const rawIntensity = (valA / 100) * (valB / 100) * penalty;
      const intensity    = rawIntensity * confidence;

      if (intensity > 0) {
        conflictScore += intensity;
        conflicts.push({
          pair,
          a,
          b,
          penalty,
          intensity,
          // Pass through hypothesis metadata so the UI can present them correctly
          confidence,
          trend,
          sample_period: samplePeriod,
        });
        this.logger.log(
          `[CognitiveAnalyzer] ${pair}: intensity=${intensity.toFixed(2)} (confidence=${Math.round(confidence * 100)}%, trend=${trend})`
        );
      }
    }

    const finalScore = Math.max(0, 100 - conflictScore);

    return {
      level: conflictScore > 50 ? 'low' : conflictScore > 20 ? 'medium' : 'high',
      score: finalScore,
      conflicts,
    };
  }
}
