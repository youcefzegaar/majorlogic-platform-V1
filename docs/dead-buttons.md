# Dead Button Sweep — M0

Audit date: 2026-05-28. One dead button found; all others verified wired.

## Wired in M0

| File | Line | Label | Fix |
|---|---|---|---|
| `apps/search-ui/src/components/intake/IntakePhase.jsx` | 81 | Save Draft | Wired to `useLocalStorage` — saves current profile to `ml_draft_v1` |

## Wired in future milestones

| File | Line | Label | Milestone |
|---|---|---|---|
| `apps/search-ui/src/components/shared/AppSidebar.jsx` | 18 | My Decisions | `// WIRED IN M3` — requires user accounts |
| `apps/search-ui/src/components/shared/AppSidebar.jsx` | 19 | Saved | `// WIRED IN M3` — requires saved decisions |
| `apps/search-ui/src/components/shared/AppSidebar.jsx` | 20 | Settings | `// WIRED IN M10` — requires user settings page |
