# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for MajorLogic Platform.

## What is an ADR?

An ADR documents an important architectural decision, the context that led to it,
alternatives considered, and the consequences of the choice.

## ADR Lifecycle

- **Proposed** — under review
- **Accepted** — implemented
- **Deprecated** — no longer applicable
- **Superseded** — replaced by another ADR

## Index

| # | Title | Status |
|---|-------|--------|
| [ADR-001](ADR-001-fastify-over-express.md) | Fastify as HTTP framework | Accepted |
| [ADR-002](ADR-002-postgresql-over-mongodb.md) | PostgreSQL as primary datastore | Accepted |
| [ADR-003](ADR-003-sha256-content-addressed-ids.md) | SHA-256 content-addressed entity IDs | Accepted |
| [ADR-004](ADR-004-domain-pack-pattern.md) | Domain Pack pattern | Accepted |
| [ADR-005](ADR-005-cognitive-constitution.md) | Cognitive Constitution governance | Accepted |

## Adding a New ADR

1. Copy `template.md` to `ADR-NNN-short-title.md`
2. Fill in all sections
3. Add a row to the index above
4. Link from the PR description
