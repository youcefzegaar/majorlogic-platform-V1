# ev-market-us — Prototype Domain (Incomplete)

This domain is a **work-in-progress prototype** and is NOT production-ready.

## Current state

- `decision-config.json` — 53 lines, gates/scores not defined
- `domain-pack.js` — 67 lines, missing: observations, normalizers, scoring, identity, insights, card-builder, entity-publisher, fit-gates

## To activate

This domain must NOT be added to `ENABLED_DOMAINS` until the following are implemented:

- [ ] Full `decision-config.json` (gates, scores, selectionStrategy, outputTemplate)
- [ ] `observations.js` — entity attribute extraction
- [ ] `normalizers.js` — score normalization
- [ ] `fit-gates.js` — hard disqualifiers
- [ ] `card-builder.js` — result card assembly
- [ ] `entity-publisher.js` — catalog publish pipeline
- [ ] Published entity catalog (`catalog/published-entities.json`)

## Reference

See `domains/laptop-student-us/` for a complete domain implementation.
