INSERT INTO ml_commercial.platform_integrations (slug, category, name, description, icon_emoji, config)
VALUES
  ('gemini',  'ai', 'Google Gemini', 'Gemini Pro / Flash for AI tasks',   '🔷', '{"model":"gemini-2.0-flash"}'),
  ('mistral', 'ai', 'Mistral AI',    'Mistral fast models',               '🤖', '{"model":"mistral-large-latest"}'),
  ('groq',    'ai', 'Groq',          'Ultra-fast LLM inference',          '🚀', '{"model":"llama3-70b-8192"}')
ON CONFLICT (slug) DO NOTHING;
