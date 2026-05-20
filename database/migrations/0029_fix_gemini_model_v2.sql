UPDATE ml_commercial.platform_integrations
SET config = jsonb_set(config, '{model}', '"gemini-2.5-flash"')
WHERE slug = 'gemini';
