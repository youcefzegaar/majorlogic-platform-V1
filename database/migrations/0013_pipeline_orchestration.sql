-- Migration 0013: Pipeline Orchestration tracking
create table if not exists ml_catalog.pipeline_runs (
  id uuid primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  status text not null default 'pending', -- pending, running, completed, failed
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

create table if not exists ml_catalog.pipeline_stages (
  id uuid primary key,
  run_id uuid not null references ml_catalog.pipeline_runs(id) on delete cascade,
  stage_name text not null, -- ingestion, enrichment, normalization, publishing
  status text not null, -- pending, running, completed, failed
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  error_message text
);

create index if not exists idx_pipeline_runs_domain_id on ml_catalog.pipeline_runs(domain_id);
create index if not exists idx_pipeline_stages_run_id on ml_catalog.pipeline_stages(run_id);
