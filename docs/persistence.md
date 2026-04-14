# Persistence Backbone

## Goal

The platform must move from an in-memory proof into a real Postgres/Supabase backbone without breaking the domain-pack model.

## What is now included

- canonical schema snapshot:
  - [database/schemas/platform_v1.sql](C:\Users\SAN\majorlogic-platform-v1\database\schemas\platform_v1.sql)
- ordered SQL migrations:
  - [database/migrations/0001_platform_init.sql](C:\Users\SAN\majorlogic-platform-v1\database\migrations\0001_platform_init.sql)
  - [database/migrations/0002_platform_views.sql](C:\Users\SAN\majorlogic-platform-v1\database\migrations\0002_platform_views.sql)
- initial domain seed:
  - [database/seeds/0001_domain_registry.sql](C:\Users\SAN\majorlogic-platform-v1\database\seeds\0001_domain_registry.sql)
- runtime repository adapter:
  - [packages/postgres-persistence/src/index.js](C:\Users\SAN\majorlogic-platform-v1\packages\postgres-persistence\src\index.js)

## Design choice

Persistence is optional at runtime.

- If no repository is passed into the platform core, the pipeline still runs as a proof environment.
- If a Postgres repository is passed, the pipeline persists:
  - raw observations
  - published entities
  - decision runs
  - ownership recommendations
  - trust audits
  - growth artifacts
  - governance events

This keeps the platform easy to demo while making the production path explicit.

## Postgres usage

1. Install dependencies with `npm install`.
2. Set `DATABASE_URL`.
3. Create a Postgres client through `createPostgresClient`.
4. Construct `PostgresPlatformRepository`.
5. Run `applyMigrations()`.
6. Pass the repository into `executePlatformPipeline(...)`.

## Why this matters

This is the first real backbone step toward Supabase/Postgres without locking the platform to the current laptop niche.
