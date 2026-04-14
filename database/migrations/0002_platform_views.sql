drop view if exists ml_catalog.published_entity_summary;
create or replace view ml_catalog.published_entity_summary as
select
  entity_id,
  domain_id,
  entity_type,
  title,
  entity_payload -> 'market' -> 'bestOffer' as best_offer,
  trust ->> 'confidenceLevel' as confidence_level,
  published_at
from ml_catalog.published_entities;
