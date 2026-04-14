alter table ml_decision.decision_runs
  add column if not exists publish_run_id uuid references ml_catalog.publish_runs(id) on delete set null;

alter table ml_decision.decision_runs
  add column if not exists catalog_version text;

create index if not exists idx_decision_runs_publish_run_id
  on ml_decision.decision_runs(publish_run_id);

create index if not exists idx_decision_runs_catalog_version
  on ml_decision.decision_runs(domain_id, catalog_version);
