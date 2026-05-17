# ADR-005: Cognitive Constitution Governance Layer

- **Status**: Accepted
- **Date**: 2025-03-05
- **Deciders**: Platform team

## Context

MajorLogic surfaces AI-generated recommendation scores in a ranked list that also carries
affiliate links. This creates two categories of risk:

1. Non-determinism risk: ML model scores can fluctuate in ways that are not meaningful to
   users but cause visible rank churn. Without a gate, small score variations propagate
   directly into the final ranking.

2. Financial incentive corruption: affiliate payout rates vary by product and partner.
   Without an explicit constraint, the ranking algorithm could be inadvertently (or
   deliberately) tuned to favor high-payout products over the best-fit products, violating
   user trust and potentially consumer protection regulations.

Code review and unit tests catch implementation bugs but cannot enforce invariants that span
the full scoring pipeline at runtime. Feature flags can disable features but cannot verify
that a ranking output satisfies governance rules before it is served.

## Decision

Implement machine-checkable governance rules as a post-decision gate in
`packages/strategic-governance/`. Every ranking response passes through the governance
package before being returned to the caller; violations are logged to
`ml_governance.guardrail_events` and the response is either blocked or flagged depending
on the rule severity.

## Alternatives Considered

| Option | Why rejected |
|--------|-------------|
| Code review only | Catches structural bugs but cannot verify runtime behavior; a rule that passes review can still be violated by a model weight update or data shift |
| Unit tests only | Tests verify expected behavior under controlled inputs; they do not run on live scoring outputs in production |
| Feature flags | Can toggle a feature on or off but cannot assert that the active output satisfies a governance invariant (e.g., top-ranked item has higher fit score than affiliate payout rank) |
| Open Policy Agent (OPA) | Powerful and general-purpose; rejected because it introduces a separate policy language (Rego), a sidecar process, and operational complexity that exceeds the current team's capacity to maintain |

## Consequences

**Good:**
- Governance rules are co-located with the scoring pipeline and version-controlled alongside it
- Every production ranking output is checked; violations are never silently swallowed
- `ml_governance.guardrail_events` provides an auditable record of all violations for compliance review
- Rules are plain JavaScript functions; no separate policy language to learn
- The gate is synchronous and in-process; it adds negligible latency compared to the ML scoring step
- Blocking rules prevent corrupt rankings from reaching users; warning rules allow review without disruption

**Accepted tradeoffs:**
- In-process governance means a bug in the governance package can affect the ranking service directly; the package has its own test suite and is treated as a critical dependency
- Rule coverage depends on developers writing rules for new features; governance gaps are possible if the process is not enforced in PR review
- The current implementation does not support hot-reloading of rules; a rule change requires a deployment

## Implementation Notes

- Governance package: `packages/strategic-governance/src/index.js`
- Violation event table: `ml_governance.guardrail_events` (columns: `rule_id`, `domain_id`, `severity`, `payload`, `created_at`)
- Rule severity levels: `block` (response suppressed, fallback served), `warn` (response served, event logged)
- Key rules enforced: affiliate-rank-vs-fit-score ordering, score-change delta threshold, required fields present in ranking output
- Admin audit log surfaces guardrail events: `apps/admin-ui/src/features/` (audit log section)
