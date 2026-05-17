# ADR-001: Fastify as HTTP Framework

- **Status**: Accepted
- **Date**: 2025-01-15
- **Deciders**: Platform team

## Context

The platform exposes a low-latency JSON API that must handle recommendation scoring, catalog
ingestion, and telemetry collection. The team is small, so framework ergonomics and built-in
tooling matter. Early prototypes used Express 4, which required manually wiring a logger,
validator, and serializer — three separate libraries with overlapping configuration surfaces.
Async/await error propagation in Express 4 also required explicit try/catch or wrapper
utilities to avoid silent failures in route handlers.

Key constraints:
- P99 latency target under 50 ms for ranking responses
- JSON Schema validation required on all ingest and API routes
- Structured logging required from day one (Pino preferred for JSON output)
- Team familiarity: Node.js, no desire to move to a compiled runtime

## Decision

Use Fastify v5 as the sole HTTP framework for `apps/api`.

## Alternatives Considered

| Option | Why rejected |
|--------|-------------|
| Express 4 | No native async error propagation; validation and logging must be added manually; measurably slower JSON serialization |
| Express 5 | Still in RC at decision time; async improvement is the only meaningful addition; same serialization gap |
| Hono | Excellent performance but ecosystem immature; middleware library coverage insufficient for planned integrations |
| Koa | Better async story than Express 4 but no built-in validation or schema-aware serialization; thinner community |

## Consequences

**Good:**
- JSON Schema validation via `@fastify/ajv-compiler` is declared on route definitions, not scattered across middleware
- Pino logger ships with Fastify; no additional dependency or config needed
- Schema-aware JSON serialization (fast-json-stringify) reduces serialization overhead for large catalog payloads
- Plugin system (`fastify-plugin`) enables clean separation of database, auth, and domain registry concerns
- Native async/await in route handlers; unhandled rejections are caught and forwarded to the error handler automatically

**Accepted tradeoffs:**
- Fastify's plugin encapsulation model (scoped context) requires deliberate decoration patterns; onboarding takes longer than Express for developers new to it
- Fewer third-party middleware packages compared to Express; some integrations required thin wrappers
- Breaking changes between Fastify v4 and v5 required migration effort when upgrading

## Implementation Notes

- Entry point and server factory: `apps/api/src/server.js`
- Route declarations use inline JSON Schema for request/response; see `apps/api/src/routes/`
- Pino transport config (pretty-print in dev, JSON in prod) is set in `apps/api/src/server.js`
- Plugin registration order matters: database plugin must register before route plugins
