# Catalog Ingestion

## Goal

Move the platform one step beyond a static proof by introducing an explicit ingestion path:

`source records -> raw acquisition -> normalized observations -> published entities`

## Current implementation

- raw domain sources:
  - [domains/laptop-student-us/sources/market-sources.json](C:\Users\SAN\majorlogic-platform-v1\domains\laptop-student-us\sources\market-sources.json)
- ingestion package:
  - [packages/catalog-ingestion/src/index.js](C:\Users\SAN\majorlogic-platform-v1\packages\catalog-ingestion\src\index.js)
- domain-specific acquisition and normalization:
  - [domains/laptop-student-us/domain-pack.js](C:\Users\SAN\majorlogic-platform-v1\domains\laptop-student-us\domain-pack.js)
- runtime ingestion script:
  - [scripts/ingest-domain.js](C:\Users\SAN\majorlogic-platform-v1\scripts\ingest-domain.js)

## What gets persisted

When `DATABASE_URL` is available, ingestion now writes to:

- `ml_raw.source_registry`
- `ml_raw.ingestion_runs`
- `ml_raw.source_observations`

## Command

```bash
npm run catalog:ingest
npm run catalog:publish
```

Ingestion writes a generated normalized snapshot locally to:

- [domains/laptop-student-us/generated/source-observations.generated.json](C:\Users\SAN\majorlogic-platform-v1\domains\laptop-student-us\generated\source-observations.generated.json)

Publishing writes a generated published-catalog snapshot locally to:

- [domains/laptop-student-us/generated/published-catalog.generated.json](C:\Users\SAN\majorlogic-platform-v1\domains\laptop-student-us\generated\published-catalog.generated.json)

Publishing also creates a versioned publish record in Supabase:

- `ml_catalog.publish_runs`
- `ml_catalog.published_entities.catalog_version`

This gives the platform an auditable publishing history instead of a single opaque latest state.

## Runtime read order

The platform runtime now reads published catalog, not raw observations.

Published catalog is resolved in this order:

1. database-backed `ml_catalog.published_entities`
2. generated published-catalog snapshot

This means the demo and API now consume published truth instead of rebuilding it during decision execution.

## Why this matters

The platform no longer depends on a single hand-authored observations file as its only path into the catalog. It now has a distinct acquisition and normalization phase that future real fetchers can plug into.
