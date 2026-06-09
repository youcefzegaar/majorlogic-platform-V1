// Optional OpenTelemetry tracing for the DDVM pipeline.
// Falls back silently to no-ops if @opentelemetry/api is not installed,
// so the orchestrator never fails due to a missing telemetry package.
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);
let _tracer = null;

try {
  const { trace } = _require('@opentelemetry/api');
  _tracer = trace.getTracer('decision-orchestrator', '1.0.0');
} catch {
  // OTel API not available — tracing disabled
}

export function startSpan(name, attrs = {}) {
  if (!_tracer) return null;
  try {
    return _tracer.startSpan(name, { attributes: attrs });
  } catch {
    return null;
  }
}

export function endSpan(span, err = null) {
  if (!span) return;
  try {
    if (err) {
      span.recordException(err);
      span.setStatus({ code: 2, message: err.message }); // SpanStatusCode.ERROR
    } else {
      span.setStatus({ code: 1 }); // SpanStatusCode.OK
    }
    span.end();
  } catch {
    // ignore span errors — never let telemetry crash the pipeline
  }
}
