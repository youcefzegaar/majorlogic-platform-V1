# Performance Baseline — M5.B

Recorded 2026-05-29. Target page: results phase (after decision run).

## Bundle Budget (Vite config)

| Chunk | Budget |
|-------|--------|
| Per chunk warning threshold | 500 kB |
| Per chunk error threshold | 1 MB |

## Manual Chunks (code splitting)

| Chunk name | Modules |
|-----------|---------|
| `vendor` | react, react-dom |
| `state` | zustand |
| `i18n` | react-i18next, i18next |
| `charts` | recharts |

Each phase component (IntakePhase, CardsPhase, ExplanationPhase, SummaryPhase, OwnershipPhase)
is imported eagerly at this stage. Phase-level lazy loading is deferred to M6 after the
shared `packages/ui` extraction, to avoid duplicating CSS-in-JS across async chunks.

## Target CWV (mobile, 4G)

| Metric | Target | Rationale |
|--------|--------|-----------|
| LCP | ≤ 2.5 s | WCAG 2.2 / Google "Good" |
| CLS | ≤ 0.1 | Explicit image dimensions + skeleton loaders |
| INP | ≤ 200 ms | Decision engine runs async; UI never blocks |

## Lighthouse Targets (M5 Gate)

| Category | Target |
|----------|--------|
| Performance (mobile) | ≥ 90 |
| Accessibility | ≥ 95 |

## Notes

- Images in catalog use `width`/`height` attributes to prevent CLS.
- Decision engine API call is async; results page skeletons prevent layout shift.
- WebP/AVIF for catalog images is a catalog-build concern (M13).
- Sentry client-side error reporting is wired in `monitoring/sentry.js` (server side).
  Client-side `ErrorBoundary.jsx` catches render errors; Sentry integration pending DSN config.
