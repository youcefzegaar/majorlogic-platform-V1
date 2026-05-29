# MajorLogic Platform V1

MajorLogic is an algorithm-driven decision platform that helps students find the best laptops for their college major and budget. Every recommendation is transparent, commercially neutral, and verifiably reproducible.

---

## Architecture Overview

The platform is built as a domain-agnostic monorepo — the decision engine understands laptops today and can be extended to any product category.

### Decision Engine (`packages/decision-engine` + `packages/platform-core`)

Core intellectual property. Takes user preferences (major, budget, priorities) through a declarative scoring pipeline:
1. **Governance check** — enforces constitutional constraints (sacrifice vector, money-blind scoring)
2. **Orchestrator + Kernel** — scores candidates, applies knockout rules
3. **Post-decision layers** — ownership strategy, commercial routing, trust audit, growth artifacts
4. **Integrity certificate** — four synchronous guards (governance-drift, catalog-truth, sacrifice, money-separation) produce a per-decision certificate stored in `ml_governance.integrity_certificates`

Schema version: **2** (`schemaVersion: 2` in every pipeline response).

### User Accounts & Saved Decisions (M3)

- Registration, login, sessions via `POST /auth/register`, `POST /auth/login`, `DELETE /auth/logout`
- Session cookies (httpOnly, Secure, SameSite=Strict) + CSRF token
- Saved decisions: `POST /user/decisions` — full snapshot, reloadable. Max 20 per user.
- My Decisions overlay in the UI lists and loads past choices.
- `schemaVersion: 2` snapshots include integrity certificate, cards, ownership strategies.

### User Settings (M10)

- `PUT /auth/account` — change display name and/or password (requires current password for password change)
- Rate-limited endpoint; password hashed with bcrypt (cost 12)
- Settings modal accessible from the sidebar

### Ethical Affiliate Gateway

All "Buy Now" links route through `/go/:domain/:entityId`. The server attaches affiliate tags at redirect time — no hardcoded affiliate links in the frontend. Purchase intent is tracked via `ml_telemetry.click_events`.

### Growth Loop

- Email capture via interstitial before Amazon redirect
- Price-drop alerts (email) when a watched device enters budget
- Day-3, Day-7, Day-30 nurture sequence; Day-30 is a regret check tied to `decisionRunId`
- Viral sharing with OpenGraph + 1-click Twitter/WhatsApp share

### Catalog Freshness (M13)

- Every decision response includes `catalogFreshness.{publishedAt, ageHours, isStale, slaHours}`
- UI shows a stale-data warning banner when catalog age exceeds SLA (default 24h, configurable via `CATALOG_FRESHNESS_SLA_HOURS`)
- `/admin/report` and the daily Telegram report both include catalog freshness status
- Price-monitor alerts via Telegram before sending price emails when catalog is stale

### Integrity & Reporting (M-gov + M-report)

- Daily Telegram report (08:00 UTC): integrity score, money-blindness %, sacrifice pass rate, catalog freshness, satisfaction average
- Real-time alert when any integrity guard fails in production
- Health-check cron (every 30 min): escalates to 🚨 on repeated failures, references Railway auto-restart

### Legal Pages

`/privacy`, `/terms` — served server-side, satisfy FTC disclosure + GDPR.

---

## Deployment

### Environment Variables

```ini
DATABASE_URL=postgres://...          # PostgreSQL (Railway / Supabase)
ENCRYPTION_KEY=32-byte-hex           # For credential encryption at rest
ADMIN_USER=admin
ADMIN_PASSWORD=strongpassword
SESSION_SECRET=random-64-char-string
VITE_API_URL=https://your-api.railway.app

# Email (Resend / SendGrid)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxx
EMAIL_FROM=MajorLogic <hello@majorlogic.ai>

# Telegram alerts
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# Optional
CATALOG_FRESHNESS_SLA_HOURS=24      # Stale-data SLA (default 24h)
ENABLED_DOMAINS=laptop-student-us
```

### Database

Migrations auto-run on startup from `database/migrations/` (append-only, numbered). No manual bootstrap needed after the initial deploy.

### Catalog Pipeline

```bash
node scripts/catalog-build.js --domain=laptop-student-us
```

Set a cron to run every 12–24 hours. The `/readiness` endpoint (used by Railway healthcheck) checks `SELECT 1` against the DB — Railway auto-restarts (ON_FAILURE × 5) if it fails.

### Running

```bash
npm run start:api    # Fastify API on PORT (default 3010)
npm run dev:ui       # Vite dev server for search-ui
```

---

## Testing

```bash
npm run test             # vitest — 213 unit tests
npm run test:node        # system.test — full pipeline integration
npm run test:regression  # regression suite — constitutional card rules
```

All three suites must pass before any merge.

---

## Directory Structure

```
apps/
  api/              Fastify server, routes, jobs, monitoring
  search-ui/        React frontend (Vite)
  admin-ui/         Admin dashboard (React)
packages/
  platform-core/    Universal pipeline orchestrator
  decision-engine/  Scoring kernel
  governance-evaluator/ Four integrity guards + certificate
  postgres-persistence/ All DB repositories + catalog-loader
  email-service/    Transactional + nurture emails
  ...
domains/
  laptop-student-us/   Domain pack, rulesets, generated catalog
database/
  migrations/       Append-only SQL migrations (0001–0035)
tests/
  unit/             Vitest unit tests
  integration/      Node integration (system.test.mjs)
  regression/       Constitutional regression suite
```

*MajorLogic: Built for epistemic honesty, designed for trust.*
