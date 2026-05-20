UPDATE ml_commercial.platform_integrations
SET config = jsonb_set(config, '{model}', '"gemini-2.0-flash"')
WHERE slug = 'gemini' AND (config->>'model' = 'gemini-1.5-flash' OR config->>'model' IS NULL);
