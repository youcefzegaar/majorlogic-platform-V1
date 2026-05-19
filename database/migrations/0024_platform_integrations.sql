-- Platform Integrations: centralized secrets & connection management
CREATE TABLE IF NOT EXISTS ml_commercial.platform_integrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,          -- 'claude', 'amazon_pa', 'postgres_replica', etc.
  category     TEXT NOT NULL,                 -- 'ai', 'ecommerce', 'database', 'webhook', 'email', 'custom'
  name         TEXT NOT NULL,
  description  TEXT,
  icon_emoji   TEXT DEFAULT '🔌',
  credentials  JSONB DEFAULT '{}'::jsonb,     -- encrypted key/value pairs
  config       JSONB DEFAULT '{}'::jsonb,     -- non-secret config (region, model, endpoint)
  is_active    BOOLEAN NOT NULL DEFAULT false,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrations_category ON ml_commercial.platform_integrations (category);
CREATE INDEX IF NOT EXISTS idx_integrations_active   ON ml_commercial.platform_integrations (is_active);

-- Seed known integration types (inactive by default, keys empty)
INSERT INTO ml_commercial.platform_integrations (slug, category, name, description, icon_emoji, config)
VALUES
  ('claude',        'ai',        'Claude (Anthropic)',        'Decision explanation, narrative generation', '🧠', '{"model":"claude-sonnet-4-6","max_tokens":1024}'),
  ('openai',        'ai',        'OpenAI',                   'GPT-4o for fallback AI tasks',              '⚡', '{"model":"gpt-4o","max_tokens":1024}'),
  ('amazon_pa',     'ecommerce', 'Amazon PA API',            'Live prices, images, availability',         '🛒', '{"region":"us-east-1","marketplace":"www.amazon.com"}'),
  ('ebay',          'ecommerce', 'eBay Finding API',         'eBay listings and prices',                  '🏷️', '{"site_id":"EBAY-US"}'),
  ('sendgrid',      'email',     'SendGrid',                 'Transactional emails and lead nurturing',   '📧', '{}'),
  ('resend',        'email',     'Resend',                   'Developer-friendly email API',              '✉️', '{}'),
  ('slack_webhook', 'webhook',   'Slack Webhook',            'Alert notifications to Slack channels',     '💬', '{}'),
  ('zapier',        'webhook',   'Zapier Webhook',           'Trigger Zapier zaps on platform events',    '⚡', '{}'),
  ('redis',         'database',  'Redis / Upstash',          'Caching layer for decision results',        '🔴', '{"tls":true}'),
  ('postgres_read', 'database',  'Postgres Read Replica',    'Offload analytics queries',                 '🐘', '{}'),
  ('google_sheets', 'custom',    'Google Sheets API',        'Export leads to spreadsheets',              '📊', '{}'),
  ('custom_api',    'custom',    'Custom API',               'Any REST API integration',                  '🔗', '{}'),
  -- Reviews & Community
  ('reddit',           'reviews', 'Reddit API',              'Fetch r/laptops & r/suggestalaptop discussions', '🟠', '{"subreddits":"laptops,suggestalaptop,college","max_posts":25}'),
  ('youtube',          'reviews', 'YouTube Data API',        'Fetch video reviews for laptop models',          '▶️', '{"max_results":5,"order":"relevance"}'),
  ('bestbuy',          'reviews', 'Best Buy API',            'Live prices, ratings, and reviews from Best Buy','🔵', '{"locale":"en-US","pageSize":10}'),
  ('google_search',    'reviews', 'Google Custom Search',    'Find expert reviews from RTINGS, Notebookcheck',  '🔍', '{"cx":"","num":5}'),
  ('trustpilot',       'reviews', 'Trustpilot API',          'Seller ratings and trust scores',                '⭐', '{"per_page":20}'),
  ('serpapi',          'reviews', 'SerpAPI',                 'Google/Bing shopping results & review snippets', '🌐', '{"engine":"google_shopping","gl":"us","hl":"en"}'),
  -- AI providers not in original seed
  ('gemini',        'ai',        'Google Gemini',            'Gemini Pro / Flash for AI tasks',           '🔷', '{"model":"gemini-2.0-flash"}'),
  ('mistral',       'ai',        'Mistral AI',               'Mistral & Mixtral fast models',             '🌬️', '{"model":"mistral-large-latest"}'),
  ('groq',          'ai',        'Groq',                     'Ultra-fast LLM inference',                  '🚀', '{"model":"llama3-70b-8192"}')
ON CONFLICT (slug) DO NOTHING;
