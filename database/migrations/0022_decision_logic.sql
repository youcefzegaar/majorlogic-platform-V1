-- Migration 0022: Decision Logic Persistence
create table if not exists ml_governance.decision_logic (
  domain_id text primary key references ml_governance.domain_registry(domain_id),
  config_json jsonb not null,
  version text not null,
  updated_at timestamptz not null default now()
);

-- Seed existing laptop domain config if possible (we will do this via code later or manual insert)
