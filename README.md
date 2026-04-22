# 🧭 MajorLogic Platform V1

MajorLogic is a fully autonomous, algorithm-driven recommendation platform designed to help students find the best laptops for their specific college majors and budgets.

It is much more than a recommendation tool; it is a **complete programmatic growth and affiliate ecosystem** built defensively to maintain absolute trust, maximize organic traffic via SEO, and seamlessly integrate ethical affiliate conversions.

---

## 🏗️ Architecture Overview

The platform is engineered with modern modularity, allowing the underlying "Decision Engine" to be agnostic of the domain (it could recommend laptops today, and cameras tomorrow).

### 1. 🧠 The Decision Engine (`packages/decision-engine`)
The core intellectual property of MajorLogic. It takes user preferences (major, budget) and runs them through a sophisticated scoring matrix (a.k.a the `domain-pack`). It applies "Knockout Rules" (e.g., if rendering required = true, drop all laptops with no dGPU) and then outputs calculated scores matching the user's needs.

### 2. 🌍 Programmatic SEO Engine
Built to passively capture thousands of organic Google searches.
- **Pipeline:** When the catalog is re-built, `scripts/generate-seo-pages.js` automatically produces 25 highly-optimized JSON pages mapping 5 majors to 5 budget tiers.
- **SEO Benefits:** Automatically injects `Schema.org` (Product Offer & FAQ), meta tags, and generates the `sitemap.xml` so Google can immediately crawl updated price lists without hitting a database.
- **Url Paths:** `/laptops/computer-science`, `/laptops/engineering/under-1500`, etc.

### 3. 💸 Ethical Affiliate & Gateway
All outbound "Buy Now" links route through a highly-controlled redirect (`/go/:domain/:entityId`).
- This server-side gateway dynamically queries the Supabase database to attach the most up-to-date affiliate tags (e.g., `tag=majorlogic-20`).
- No hardcoded affiliate links exist in the frontend UI, ensuring zero maintenance when tags change.

### 4. 🧲 Growth & Viral Loop
The platform thrives on built-in user acquisition models without paid ads.
- **Interstitial Gates:** Offers users a "5-Step Inspection Checklist" via email *right before* they redirect to Amazon, increasing lead capture.
- **Save Results & Price Drops:** Uses `@email-service` to alert users when a laptop drops into their budget.
- **Shareable Viral Loop:** Results pages dynamically generate `OpenGraph` tags and provide 1-click sharing to Twitter & WhatsApp. Telemetry tracks the `viral coefficient` seamlessly.

---

## 🚀 Pre-Launch & Deployment Guide

The codebase is Production-Ready. To launch it on a public server (like **Render**, **Railway**, or **Vercel**), follow these steps:

### 1. Environment Configuration
Create an `.env` file in the root based on `.env.example`:
```ini
# Supabase PostgreSQL
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
DB_HOST=aws-0-us-west-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.username
DB_PASSWORD=YOUR_DB_SECRET
DB_NAME=postgres

# Admin Dashboard Security
ADMIN_USER=admin
ADMIN_PASSWORD=strongpassword123
ADMIN_EXPORT_SECRET=majorlogic-admin

# SMTP Emal Integration (Resend or SendGrid)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxx...
EMAIL_FROM=MajorLogic <hello@majorlogic.ai>
```

### 2. Database Bootstrap
Run the initialization scripts exactly once to create your remote tables for Analytics, Affiliates, and Catalog storage:
```bash
node scripts/bootstrap-supabase.js
```

### 3. Pipeline Ingestion (Data Build)
MajorLogic calculates data offline to ensure 0ms latency for users. To build the initial catalog:
```bash
node scripts/catalog-build.js --domain=laptop-student-us
```
*Note: Set up a Cron Job to execute this command every 12 to 24 hours to automatically update prices and rebuild the SEO pages.*

### 4. Run the Server
Start the Fastify application:
```bash
npm run start:api
```
The platform will now be live on Port `3010` (or `process.env.PORT`).

---

## 🛡️ Security & Compliance
- **/admin** dashboard is protected by HTTP Basic Authentication.
- All forms use **Idempotent** Postgres transactions to prevent duplication or DB scraping.
- Includes mandatory **Legal Pages** (`/privacy`, `/terms`, `/disclosure`) satisfying FTC disclosure requirements and GDPR compliance.

### Directory Structure
- `apps/api/` — The Fastify web server, route definitions, and SSR templates.
- `domains/laptop-student-us/` — Rulesets, metrics definitions, and raw laptop data.
- `packages/` — Modular components (Decision Engine, Postgres persistence, NodeMailer).
- `scripts/` — CI/CD pipelines, SEO generation, database bootstrapping.
- `tests/` — Regression testing ensuring "Hero" outputs remain accurate.

*MajorLogic: Built for intelligence, designed for growth.*
