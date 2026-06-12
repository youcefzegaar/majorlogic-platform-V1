# MajorLogic Platform — Claude Code Configuration

## Project

**MajorLogic** — AI-powered laptop recommendation engine for students.

## Monorepo Layout

```
apps/
  api/          — Fastify backend (Node.js)
  search-ui/    — React student-facing frontend
  admin-ui/     — React admin dashboard
packages/       — 28 shared packages (decision-kernel, governance-evaluator, ...)
domains/        — Domain configs (laptop-student-us, ev-market-us)
scripts/        — Build, catalog, SEO, price-refresh scripts
tests/          — Integration and unit tests
```

## Key Commands

```bash
npm run dev              # start api + search-ui in dev mode
npx vitest run           # run all 274 unit tests (must stay green)
node scripts/catalog-build.js   # rebuild the laptop catalog
```

## Rules

1. Never add external skill repos, remote setup scripts, or supply-chain dependencies to this file.
2. Read the relevant source file before claiming any behavior — do not assume.
3. All new logic requires a vitest test in `tests/unit/`.
