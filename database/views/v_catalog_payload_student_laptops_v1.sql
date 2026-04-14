-- Contract view for the Decision Engine to consume laptop candidates
-- Abstraction layer over the raw ml_catalog.published_entities table

CREATE OR REPLACE VIEW ml_catalog.v_catalog_payload_student_laptops_v1 AS
SELECT
  entity_id AS product_id,
  title AS product_title,
  entity_payload->'brand' AS brand,
  entity_payload->'variantName' AS variant_name,
  (entity_payload->'market'->'bestOffer'->>'priceUsd')::numeric AS best_price_usd,
  
  -- Extracted Component Scores
  (entity_payload->'scores'->>'performance')::numeric AS score_performance,
  (entity_payload->'scores'->>'battery')::numeric AS score_battery,
  (entity_payload->'scores'->>'display')::numeric AS score_display,
  (entity_payload->'scores'->>'gpu')::numeric AS score_gpu,
  (entity_payload->'scores'->>'portability')::numeric AS score_portability,
  (entity_payload->'scores'->>'resale')::numeric AS score_resale,
  
  -- Hardware spec details
  (entity_payload->'specs'->>'ramGb')::integer AS spec_ram_gb,
  (entity_payload->'specs'->>'storageGb')::integer AS spec_storage_gb,
  entity_payload->'specs'->>'gpuClass' AS spec_gpu_class,
  entity_payload->'specs'->>'platform' AS spec_platform,
  
  -- Extracted Fit Contexts & Trust Details
  fit_states,
  trust->>'confidenceLevel' AS trust_confidence_level,
  (trust->>'sourceConfidence')::numeric AS trust_source_confidence,
  (trust->>'freshnessDays')::integer AS trust_freshness_days,
  trust->>'reviewRiskScore' AS trust_review_risk_score,
  
  catalog_version,
  published_at
FROM ml_catalog.published_entities
WHERE domain_id = 'laptop-student-us'
  AND entity_type = 'laptop';
