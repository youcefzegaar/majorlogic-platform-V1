// apps/api/src/metrics.js
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('majorlogic-decisions', '0.1.0');

export const decisionLatency = meter.createHistogram('decision_pipeline_duration_ms', {
  description: 'End-to-end latency of executeUniversalPipeline',
  unit: 'ms',
});

export const decisionRunsTotal = meter.createCounter('decision_runs_total', {
  description: 'Total decision pipeline executions',
});

export const decisionErrorsTotal = meter.createCounter('decision_errors_total', {
  description: 'Total failed decision pipeline executions',
});

export const constitutionViolationsTotal = meter.createCounter('constitution_violations_total', {
  description: 'Count of governance guardrail violations',
});

export const recoveryAttemptsTotal = meter.createCounter('recovery_engine_attempts_total', {
  description: 'Zero-result recovery attempts',
});

export const narrativeCacheHits = meter.createCounter('narrative_cache_hits_total');
export const narrativeCacheMisses = meter.createCounter('narrative_cache_misses_total');
