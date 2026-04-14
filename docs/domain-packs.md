# Domain Packs

## Why domain packs exist

The current laptop niche is intentionally treated as the first proof domain, not as the platform itself.

MajorLogic should be able to support future complex purchase domains such as:

- vehicles
- medical equipment
- camera systems
- furniture bundles
- industrial tools
- enterprise software procurement

without rebuilding the platform core.

## Contract

Each domain pack owns the domain-specific parts of the decision system:

- how raw observations become published entities
- how fit states are computed
- how profile eligibility is evaluated
- how entities are scored
- how cards are explained
- how ownership is recommended
- how growth surfaces are phrased

The platform core owns:

- orchestration
- repository/package boundaries
- catalog publication flow
- trust checks
- governance checks
- API and execution pipeline

## Current pack

- [domains/laptop-student-us/domain-pack.js](C:\Users\SAN\majorlogic-platform-v1\domains\laptop-student-us\domain-pack.js)

## Future pack shape

Every new domain should ship with:

- a `domain-pack.js`
- a `ruleset.json`
- source observations or ingestion adapters
- domain baselines when needed

This gives us proof-of-concept speed today and platform-level scalability tomorrow.
