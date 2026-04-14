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

create unique index if not exists idx_publish_runs_domain_version
  on ml_catalog.publish_runs(domain_id, catalog_version);

alter table ml_catalog.published_entities
  add column if not exists publish_run_id uuid references ml_catalog.publish_runs(id) on delete set null;

alter table ml_catalog.published_entities
  add column if not exists catalog_version text;

create index if not exists idx_published_entities_publish_run_id
  on ml_catalog.published_entities(publish_run_id);

create index if not exists idx_published_entities_catalog_version
  on ml_catalog.published_entities(domain_id, catalog_version);

drop view if exists ml_catalog.published_entity_summary;
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

drop view if exists ml_catalog.active_publish_runs;
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
