-- Canonical platform schema snapshot.
-- Source of execution order lives under database/migrations/.

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

create table if not exists ml_catalog.publish_runs (
  id uuid primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  catalog_version text not null,
  source_observation_count integer not null default 0,
  published_entity_count integer not null default 0,
  observation_source text not null,
  status text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists ml_decision.decision_runs (
  id uuid primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  publish_run_id uuid,
  catalog_version text,
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

create or replace view ml_catalog.published_entity_summary as
select
  entity_id,
  domain_id,
  catalog_version,
  entity_type,
  title,
  entity_payload -> 'market' -> 'bestOffer' as best_offer,
  trust ->> 'confidenceLevel' as confidence_level,
  published_at
from ml_catalog.published_entities;

create or replace view ml_catalog.active_publish_runs as
select distinct on (domain_id)
  domain_id,
  id as publish_run_id,
  catalog_version,
  source_observation_count,
  published_entity_count,
  observation_source,
  status,
  created_at,
  completed_at
from ml_catalog.publish_runs
where status = 'completed'
order by domain_id, completed_at desc nulls last, created_at desc;
