# ADR-003: SHA-256 Content-Addressed Entity IDs

- **Status**: Accepted
- **Date**: 2025-02-10
- **Deciders**: Platform team

## Context

Catalog entities (laptops, peripherals) are ingested from multiple sources: Amazon, seller
feeds, and scrapers. The same physical product frequently appears under different seller IDs,
ASINs, or SKU strings. Without a stable identity, repeated ingestion creates duplicate rows
and `ON CONFLICT` upserts fail to match the existing record because the primary key differs
across runs.

The requirement is idempotent re-ingestion: running the same ingestion pipeline twice must
produce the same database state, not double the rows. This also means the entity ID must be
derivable from the entity's content alone, without a database round-trip to check for
existence first.

A secondary class of records — telemetry events, scoring runs, audit entries — has no
identity field that can be canonicalized. These must remain unique per occurrence.

Security constraint: `Math.random()` is explicitly prohibited by ESLint rule
`no-restricted-globals`. It must never be used to generate IDs because its output is
predictable and unsuitable for any identifier that could have security implications.

## Decision

Use a SHA-256 hash of canonical identity fields as the primary key for catalog entities;
use `crypto.randomUUID()` for all event and audit records.

## Alternatives Considered

| Option | Why rejected |
|--------|-------------|
| `randomUUID()` for all records | Breaks idempotent re-ingestion; two ingestion runs produce different UUIDs for the same physical product; `ON CONFLICT` cannot match them |
| Seller SKU as primary key | SKUs are seller-specific and unstable; the same product has different SKUs across Amazon, eBay, and direct feeds; collisions and gaps are common |
| Auto-increment integer | Not derivable from content; requires a database round-trip before insert; breaks distributed or offline ingestion pipelines |
| ULID / KSUID | Time-ordered, but still random; does not provide content-addressability; re-ingestion still creates duplicates |

## Consequences

**Good:**
- Ingestion pipelines are idempotent: the same product ingested ten times produces one row
- `INSERT ... ON CONFLICT (id) DO UPDATE` works correctly because the ID is deterministic
- No database round-trip needed to check existence before insert; the ID is computed locally
- Cross-source deduplication is automatic: Amazon ASIN and a scraper feed for the same laptop resolve to the same ID if canonical fields match
- Event records (telemetry, audit) remain globally unique via `randomUUID()`

**Accepted tradeoffs:**
- Canonical field selection is critical; adding or removing a field from the hash changes the ID for existing entities and requires a migration or re-ingestion
- Hash collisions are theoretically possible but negligible at catalog scale (SHA-256 collision probability is astronomically low for millions of records)
- The canonical field set must be documented and stable; changes require a formal review

## Implementation Notes

- ID generation utility: `packages/catalog-identity/src/index.js`
- Canonical fields hashed for laptop entities: brand, model name, storage capacity, RAM, CPU model (normalized to lowercase, whitespace-collapsed)
- Amazon adapter (content-address fix applied 2025-05-17): `packages/catalog-core/src/acquisition/AmazonAdapter.js`
- ESLint rule prohibiting `Math.random()`: configured in root `.eslintrc` as `no-restricted-globals`
- All event tables (`ml_telemetry`, `ml_decision`, `ml_governance`) use `DEFAULT gen_random_uuid()` at the database level as a safety net
