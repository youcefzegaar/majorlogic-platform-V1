create schema if not exists ml_raw;
create schema if not exists ml_catalog;
create schema if not exists ml_decision;
create schema if not exists ml_growth;
create schema if not exists ml_governance;

create table if not exists ml_governance.domain_registry (
  domain_id text primary key,
  entity_type text not null,
  segment_key text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ml_raw.source_observations (
  id uuid primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  source_name text not null,
  source_url text not null,
  observation_type text not null,
  raw_payload jsonb not null,
  fetched_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists ml_catalog.published_entities (
  entity_id text primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  publish_run_id uuid,
  catalog_version text,
  entity_type text not null,
  title text not null,
  entity_payload jsonb not null,
  fit_states jsonb not null,
  trust jsonb not null,
  published_at timestamptz not null
);

create table if not exists ml_decision.decision_runs (
  id uuid primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  profile_payload jsonb not null,
  logic_version text not null,
  cards_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists ml_decision.ownership_recommendations (
  id uuid primary key,
  decision_run_id uuid not null references ml_decision.decision_runs(id) on delete cascade,
  strategy_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists ml_decision.trust_audits (
  id uuid primary key,
  decision_run_id uuid not null references ml_decision.decision_runs(id) on delete cascade,
  audit_payload jsonb not null,
  audit_ok boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists ml_growth.page_payloads (
  id uuid primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  surface_type text not null,
  slug text not null,
  payload_json jsonb not null,
  generated_at timestamptz not null default now()
);

create table if not exists ml_growth.share_artifacts (
  id uuid primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  artifact_type text not null,
  artifact_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists ml_governance.guardrail_events (
  id uuid primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  layer_name text not null,
  event_type text not null,
  details jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_source_observations_domain_id
  on ml_raw.source_observations(domain_id);

create index if not exists idx_published_entities_domain_id
  on ml_catalog.published_entities(domain_id);

create index if not exists idx_decision_runs_domain_id
  on ml_decision.decision_runs(domain_id);

create index if not exists idx_page_payloads_domain_id
  on ml_growth.page_payloads(domain_id);
