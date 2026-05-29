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

---

## M3 — User Accounts (schemaVersion: 2)

Added in migrations 0030–0032 (schema `ml_users`):

| Migration | What it adds |
|-----------|-------------|
| `0030_user_accounts.sql` | `ml_users.{users, user_sessions, saved_decisions, price_alerts}` |
| `0031_shared_links.sql` | `ml_users.shared_links` (expiring share tokens, no PII) |
| `0032_feedback_user_id.sql` | `user_id` column on `ml_telemetry.user_feedback` |

### Run order for a fresh database

```bash
# 1. Bootstrap core schema (runs all migrations in order)
node scripts/bootstrap-supabase.js

# 2. Verify connection
node scripts/check-supabase-connection.js
```

### Key design decisions

- **Sessions** use `randomBytes(32).toString('hex')` in the cookie; only the SHA-256 hash is stored in DB.
- **Passwords** use bcrypt (cost 10). The login always runs bcrypt.compare even when the user is not found (timing-safe).
- **User errors** return the same generic message for "user not found" and "wrong password" (no enumeration).
- **Shared links** contain only non-PII snapshot data; the token is a random 32-byte hex string (no user info in token).
- **Credential encryption** uses AES-256-GCM with a per-record random IV (M-pre upgrade from CBC).

### Environment variables required for accounts

```
DATABASE_URL=postgresql://...        # Supabase connection string
BASE_URL=https://majorlogic.ai       # Used to construct share link URLs
COOKIE_SECRET=<48-char hex>          # Signs the session cookie
ENCRYPTION_KEY=<32-char hex>         # Encrypts third-party credentials at rest
```
