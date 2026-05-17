# ADR-002: PostgreSQL as Primary Datastore

- **Status**: Accepted
- **Date**: 2025-01-20
- **Deciders**: Platform team

## Context

MajorLogic stores several distinct classes of data: structured catalog entities with known
schemas, flexible JSONB payloads for raw ingestion, time-series telemetry events, decision
audit trails, and commercial/affiliate records. The audit trail requirement is strict —
every scoring decision and governance event must be retrievable for compliance review.
Strong consistency (ACID transactions) is non-negotiable for the audit and commercial
namespaces.

The schema is organized into five PostgreSQL namespaces:
- `ml_decision` — scoring runs, ranking decisions, governance events
- `ml_raw` — raw catalog payloads before normalization
- `ml_telemetry` — click, conversion, and session events
- `ml_growth` — experiment assignments and metric snapshots
- `ml_commercial` — affiliate links, payout records, partner config

This mix of structured and semi-structured data, combined with the consistency requirement,
shaped the datastore choice.

## Decision

Use PostgreSQL 15 (hosted on Supabase) as the sole primary datastore for all namespaces.

## Alternatives Considered

| Option | Why rejected |
|--------|-------------|
| MongoDB | Flexible schema is appealing for raw payloads, but ACID guarantees are weaker; multi-document transactions add latency; no native enum or domain types for governance records |
| PlanetScale (MySQL-compatible) | Strong offering but no JSONB column type; raw ingestion payloads would require a separate blob store or excessive schema migrations; foreign key constraints disabled by design |
| SQLite | Excellent for local dev and tests but not suitable for multi-process production deployment; no schema namespaces; concurrency limits unacceptable for telemetry volume |
| Separate stores per namespace | Operationally expensive; cross-namespace queries (e.g., joining decisions with telemetry) become distributed joins; consistency guarantees harder to enforce |

## Consequences

**Good:**
- JSONB columns in `ml_raw` handle variable-structure ingestion payloads without a separate document store
- Full ACID transactions across namespaces enable atomic audit writes alongside decision records
- `ON CONFLICT DO UPDATE` (upsert) works correctly with content-addressed IDs (see ADR-003)
- PostgreSQL row-level security via Supabase auth enables future multi-tenant isolation without application-layer changes
- Schema namespaces allow different retention and backup policies per namespace in a single cluster
- `pg_trgm` and full-text search reduce the need for a separate search service for catalog queries

**Accepted tradeoffs:**
- Schema migrations must be managed explicitly; Supabase migrations directory grows with each release
- JSONB query performance degrades without GIN indexes; developers must remember to add indexes when adding JSONB filter paths
- Supabase-hosted PostgreSQL introduces a managed-service dependency; self-hosting is possible but not tested

## Implementation Notes

- Persistence layer: `packages/postgres-persistence/src/index.js`
- Migration files: `database/migrations/` (ordered numerically, run via `supabase db push` or direct `psql`)
- Schema namespace creation: earliest migration files establish the five `CREATE SCHEMA` statements
- Connection pooling: configured via `DATABASE_URL` environment variable; PgBouncer provided by Supabase
