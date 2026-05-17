/**
 * Integration Service — single source of truth for external API credentials.
 *
 * Reads from ml_commercial.platform_integrations (admin-managed, DB-stored, encrypted).
 * Falls back to environment variables ONLY for bootstrap secrets (DATABASE_URL, JWT_SECRET).
 * Application code should NEVER read process.env for API keys — use this service instead.
 */

let _cache = new Map();
let _cacheTs = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

export async function getIntegration(slug) {
  const now = Date.now();
  if (_cache.has(slug) && now - _cacheTs < CACHE_TTL_MS) {
    return _cache.get(slug);
  }

  const { getRepository } = await import("../db/repository.js");
  const repo = await getRepository();
  if (!repo) return null;

  const integration = await repo.getIntegrationBySlug(slug);
  if (integration) {
    _cache.set(slug, integration);
    _cacheTs = now;
  }
  return integration ?? null;
}

export function clearIntegrationCache() {
  _cache.clear();
  _cacheTs = 0;
}

// ── Typed Accessors ───────────────────────────────────────────────────────────

export async function getClaudeConfig() {
  const i = await getIntegration("claude");
  if (!i?.is_active || !i.credentials?.api_key) return null;
  return {
    apiKey: i.credentials.api_key,
    model:  i.config?.model ?? "claude-sonnet-4-6",
    maxTokens: parseInt(i.config?.max_tokens ?? 1024),
  };
}

export async function getAmazonPAConfig() {
  const i = await getIntegration("amazon_pa");
  if (!i?.is_active || !i.credentials?.access_key) return null;
  return {
    accessKey:  i.credentials.access_key,
    secretKey:  i.credentials.secret_key,
    partnerTag: i.credentials.partner_tag ?? process.env.DEFAULT_AFFILIATE_TAG ?? "majorlogic-20",
    region:     i.config?.region ?? "us-east-1",
    marketplace: i.config?.marketplace ?? "www.amazon.com",
  };
}

export async function getEmailConfig(preferred = "sendgrid") {
  for (const slug of [preferred, "sendgrid", "resend"]) {
    const i = await getIntegration(slug);
    if (i?.is_active && i.credentials?.api_key) {
      return { provider: slug, apiKey: i.credentials.api_key };
    }
  }
  return null;
}

export async function getWebhookUrl(slug) {
  const i = await getIntegration(slug);
  if (!i?.is_active || !i.credentials?.webhook_url) return null;
  return i.credentials.webhook_url;
}

export async function getOpenAIConfig() {
  const i = await getIntegration("openai");
  if (!i?.is_active || !i.credentials?.api_key) return null;
  return {
    apiKey: i.credentials.api_key,
    model:  i.config?.model ?? "gpt-4o",
  };
}

export async function getRedisConfig() {
  const i = await getIntegration("redis");
  if (!i?.is_active || !i.credentials?.connection_url) return null;
  return { url: i.credentials.connection_url, tls: i.config?.tls ?? true };
}

export async function getReadReplicaUrl() {
  const i = await getIntegration("postgres_read");
  if (!i?.is_active || !i.credentials?.connection_url) return null;
  return i.credentials.connection_url;
}

// security: isolated service function for testing a postgres connection.
// Keeps direct DB client usage out of route handlers (Direct DB Access fix).
export async function testPostgresConnection(connectionUrl) {
  const { createPostgresClient } = await import("../../../../packages/postgres-persistence/src/index.js");
  const client = await createPostgresClient(connectionUrl);
  try {
    await client.query("SELECT 1");
  } finally {
    await client.end();
  }
}
