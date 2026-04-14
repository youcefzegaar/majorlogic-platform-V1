create table if not exists ml_raw.source_registry (
  source_id text primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  source_type text not null,
  source_name text not null,
  source_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ml_raw.ingestion_runs (
  id uuid primary key,
  domain_id text not null references ml_governance.domain_registry(domain_id),
  source_count integer not null default 0,
  normalized_count integer not null default 0,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_source_registry_domain_id
  on ml_raw.source_registry(domain_id);

create index if not exists idx_ingestion_runs_domain_id
  on ml_raw.ingestion_runs(domain_id);
