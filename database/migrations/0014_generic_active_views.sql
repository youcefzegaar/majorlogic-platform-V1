-- Migration 0014: Generic Active Entities View
-- This view allows querying entities from the latest successful publish run across any domain.

create or replace view ml_catalog.active_entities as
select 
  e.entity_id,
  e.domain_id,
  e.publish_run_id,
  e.catalog_version,
  e.entity_type,
  e.title,
  e.entity_payload,
  e.fit_states,
  e.trust,
  e.published_at
from ml_catalog.published_entities e
join ml_catalog.active_publish_runs apr on e.publish_run_id = apr.publish_run_id;

-- Comment: This view solves the hardcoding issue by automatically linking to the 'active' run.
-- You can now query: select * from ml_catalog.active_entities where domain_id = 'any-domain';
