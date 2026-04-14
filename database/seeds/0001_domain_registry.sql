insert into ml_governance.domain_registry (
  domain_id,
  entity_type,
  segment_key,
  metadata
) values (
  'laptop-student-us',
  'laptop_variant',
  'major',
  '{"scope":"student laptop buying decisions in the US"}'::jsonb
)
on conflict (domain_id) do update set
  entity_type = excluded.entity_type,
  segment_key = excluded.segment_key,
  metadata = excluded.metadata;
