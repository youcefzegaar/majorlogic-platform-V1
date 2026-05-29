# Feedback Tag Convention

All feedback tags sent to `POST /api/v1/:domain/feedback` follow these conventions.

## Overall feedback (SummaryPhase)

| Tag | Meaning |
|-----|---------|
| `would_repurchase` | User says they would make the same decision again |
| `would_not_repurchase` | User expresses regret about the decision |

## Per-reason feedback (ExplainabilityPanel L1)

Per-reason votes are submitted automatically when the user clicks 👍/👎 on an explanation reason row.

Format: `reason:<dimKey>:<vote>`

| Tag | Meaning |
|-----|---------|
| `reason:performance:helpful` | The performance reason was useful |
| `reason:performance:unhelpful` | The performance reason was not useful |
| `reason:portability:helpful` | The portability reason was useful |
| `reason:portability:unhelpful` | The portability reason was not useful |
| `reason:value:helpful` | The value reason was useful |
| `reason:value:unhelpful` | The value reason was not useful |
| `reason:display:helpful` | The display reason was useful |
| `reason:display:unhelpful` | The display reason was not useful |
| `reason:reason_0:helpful` | Fallback tag when dimKey is not available (first reason) |

### dimKey values

`dimKey` comes from `reason.dimKey` in the explanation object, which maps to dimension keys from the
decision kernel: `performance`, `portability`, `value`, `display`, `battery`, `build`.

When `dimKey` is absent (fallback reasons), the tag uses `reason_{idx}` where `idx` is the 0-based
position of the reason in the list.

## Score convention for per-reason votes

| Vote | score sent |
|------|-----------|
| 👍 helpful | 5 |
| 👎 unhelpful | 2 |

These scores are distinct from overall satisfaction (1–5) so aggregate queries can filter by tag
prefix to separate overall vs. per-reason feedback.
