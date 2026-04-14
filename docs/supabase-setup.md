# Supabase Setup

## Goal

Connect the new MajorLogic platform repository directly to Supabase without changing the legacy repository.

## What is already prepared

- root env template:
  - [\.env.example](C:\Users\SAN\majorlogic-platform-v1\.env.example)
- connection check:
  - [scripts/check-supabase-connection.js](C:\Users\SAN\majorlogic-platform-v1\scripts\check-supabase-connection.js)
- migration/bootstrap script:
  - [scripts/bootstrap-supabase.js](C:\Users\SAN\majorlogic-platform-v1\scripts\bootstrap-supabase.js)
- Postgres repository adapter:
  - [packages/postgres-persistence/src/index.js](C:\Users\SAN\majorlogic-platform-v1\packages\postgres-persistence\src\index.js)

## Minimum setup

1. Copy `.env.example` to `.env`.
2. Put the real `DATABASE_URL` from your Supabase project.
3. Optionally fill `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for future API features.

## Commands

Print migration order:

```bash
npm run db:migration:print
```

Check database connectivity:

```bash
npm run db:check
```

Apply schema and seed the domain registry:

```bash
npm run db:bootstrap
```

Run the demo pipeline against the same environment:

```bash
npm run demo
```

If `DATABASE_URL` is set, the demo and API will also persist platform records into Postgres.

## Current limitation

The repo is ready for Supabase, but I have not injected your live project credentials myself. The final activation step is adding your real `.env` values.
