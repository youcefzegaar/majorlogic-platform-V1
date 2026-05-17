# ADR-004: Domain Pack Pattern

- **Status**: Accepted
- **Date**: 2025-02-18
- **Deciders**: Platform team

## Context

MajorLogic is designed to serve multiple recommendation domains (e.g., laptop-student-us,
laptop-professional-eu, peripherals-gaming). Each domain has distinct scoring weights,
filter rules, affiliate routing tables, and governance thresholds. As the number of domains
grows, the configuration must remain version-controlled, reviewable in pull requests, and
deployable without a full service restart.

At the same time, operators need to adjust domain parameters without a code deployment.
The solution must support both file-based defaults (committed to the repository) and
database-stored overrides (editable at runtime via the admin UI), with the database value
taking precedence when present.

## Decision

Each recommendation domain is defined as an ES module exporting a plain JavaScript object
(the "domain pack"). The API loads domain packs from the file system at startup and registers
them in memory. On each request, the registry checks the database for an override; if one
exists, it deep-merges the override into the file-based pack before applying it.

## Alternatives Considered

| Option | Why rejected |
|--------|-------------|
| Database-only config | Config changes bypass version control and code review; no audit trail without extra infrastructure; hard to roll back a bad config change |
| Environment variables | Not expressive enough for nested scoring weights and rule arrays; secret management becomes entangled with non-secret config; no per-domain namespacing without complex prefixing |
| JSON config files only | No runtime override capability; every parameter change requires a redeployment; unsuitable for operators who need to tune weights without engineering involvement |
| YAML files with a config service | Introduces a runtime dependency on an external config service; adds latency to every request that re-fetches config; overkill for the current team size |

## Consequences

**Good:**
- Domain definitions are plain ES module objects; no schema registration, no code generation
- File-based defaults are committed to the repository and go through normal pull request review
- Database overrides allow operators to tune parameters at runtime without a deployment
- Deep-merge strategy means an operator only needs to override the specific fields that differ; the rest fall back to the file-based defaults
- Adding a new domain requires creating one file and one database row; no service changes needed
- The domain pack structure is inspectable in the admin UI and diffable in git

**Accepted tradeoffs:**
- Deep-merge semantics can be surprising when arrays are involved; array fields in overrides replace rather than append to the file-based array
- The registry holds all domain packs in memory; domains with very large config objects (unlikely but possible) could increase the process memory footprint
- File-based defaults and database overrides must stay schema-compatible; a structural change to the domain pack object requires updating both sources

## Implementation Notes

- Reference domain pack: `domains/laptop-student-us/domain-pack.js`
- Registry (load, merge, lookup): `apps/api/src/registry.js`
- Database override table: `ml_decision.domain_config` (keyed by `domain_id`)
- Admin UI for runtime override editing: `apps/admin-ui/src/features/` (domain config section)
