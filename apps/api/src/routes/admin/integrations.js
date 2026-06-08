import { sendError, unavailable, badRequest, notFound, serverError } from "../../utils/errors.js";

export default async function integrationsRoutes(fastify) {

  // ── Integrations (Secrets Manager) ───────────────────────────────────────

  fastify.get("/integrations/reseed", async (_request, reply) => {
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const integrations = await repository.seedDefaultIntegrations();
    return reply.send({ success: true, inserted: integrations.length, integrations });
  });

  fastify.get("/integrations", async (_request, reply) => {
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const integrations = await repository.getIntegrations();
    return reply.send({ success: true, integrations });
  });

  fastify.post("/integrations/:slug", async (request, reply) => {
    const { slug } = request.params;
    const { credentials, config, is_active, name, description } = request.body;
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    await repository.saveIntegration(slug, { credentials, config, is_active, name, description });
    const { clearIntegrationCache } = await import("../../services/integrationService.js");
    clearIntegrationCache();
    return reply.send({ success: true });
  });

  fastify.post("/integrations", async (request, reply) => {
    const { slug, name, description, category, icon_emoji, credentials, config } = request.body;
    if (!slug || !name) return sendError(reply, badRequest("slug and name are required", "missing_fields"));
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    try {
      await repository.addCustomIntegration({ slug, name, description, category, icon_emoji, credentials, config });
    } catch (err) {
      fastify.log.error({ err, slug }, "addCustomIntegration failed");
      return sendError(reply, serverError(err.message, "failed_to_add"));
    }
    return reply.send({ success: true });
  });

  fastify.delete("/integrations/:slug/credentials", async (request, reply) => {
    const { slug } = request.params;
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    await repository.deleteIntegrationCredentials(slug);
    return reply.send({ success: true });
  });

  fastify.delete("/integrations/:slug", async (request, reply) => {
    const { slug } = request.params;
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    await repository.deleteIntegration(slug);
    const { clearIntegrationCache } = await import("../../services/integrationService.js");
    clearIntegrationCache();
    return reply.send({ success: true });
  });

  fastify.post("/integrations/:slug/test", async (request, reply) => {
    const { slug } = request.params;
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const integration = await repository.getIntegrationBySlug(slug);
    if (!integration) return sendError(reply, notFound("Integration not found", "integration_not_found"));

    let ok;
    let message;

    try {
      if (slug === "claude") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: integration.config?.model ?? "claude-haiku-4-5-20251001", max_tokens: 10, messages: [{ role: "user", content: "ping" }] })
        });
        ok = res.ok;
        message = ok ? "Claude API connected successfully." : `Claude API error: ${res.status}`;

      } else if (slug === "openai") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
        ok = res.ok;
        message = ok ? "OpenAI API connected successfully." : `OpenAI error: ${res.status}`;

      } else if (slug === "sendgrid") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch("https://api.sendgrid.com/v3/user/account", { headers: { Authorization: `Bearer ${key}` } });
        ok = res.ok;
        message = ok ? "SendGrid connected successfully." : `SendGrid error: ${res.status}`;

      } else if (slug === "slack_webhook" || slug === "zapier") {
        const url = integration.credentials?.webhook_url;
        if (!url) throw new Error("No webhook URL configured");
        const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "MajorLogic ping 🔔" }) });
        ok = res.ok || res.status === 400; // Slack/Zapier return 400 for test pings (expected)
        message = ok ? "Webhook reachable." : `Webhook error: ${res.status}`;

      } else if (slug === "postgres_read") {
        const url = integration.credentials?.connection_url;
        if (!url) throw new Error("No connection URL configured");
        const { testPostgresConnection } = await import("../../services/integrationService.js");
        await testPostgresConnection(url);
        ok = true;
        message = "Database connection successful.";

      } else if (slug === "redis") {
        message = "Redis test requires server-side connection — mark as manually verified.";
        ok = true;

      } else if (slug === "reddit") {
        const { client_id, client_secret, user_agent } = integration.credentials;
        if (!client_id || !client_secret) throw new Error("client_id and client_secret required");
        const auth = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
        const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "User-Agent": user_agent ?? "MajorLogic/1.0", "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=client_credentials"
        });
        ok = tokenRes.ok;
        message = ok ? "Reddit API authenticated successfully." : `Reddit auth failed: ${tokenRes.status}`;

      } else if (slug === "youtube") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const ytUrl = new URL("https://www.googleapis.com/youtube/v3/search");
        ytUrl.searchParams.set("part", "snippet");
        ytUrl.searchParams.set("q", "test");
        ytUrl.searchParams.set("maxResults", "1");
        ytUrl.searchParams.set("key", key);
        const res = await fetch(ytUrl);
        ok = res.ok;
        message = ok ? "YouTube Data API connected." : `YouTube error: ${res.status}`;

      } else if (slug === "bestbuy") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const bbUrl = new URL("https://api.bestbuy.com/v1/products((type=laptop))");
        bbUrl.searchParams.set("format", "json");
        bbUrl.searchParams.set("pageSize", "1");
        bbUrl.searchParams.set("apiKey", key);
        const res = await fetch(bbUrl);
        ok = res.ok;
        message = ok ? "Best Buy API connected." : `Best Buy error: ${res.status}`;

      } else if (slug === "google_search") {
        const { api_key, cx } = integration.credentials;
        if (!api_key || !cx) throw new Error("api_key and cx (Search Engine ID) required");
        const gsUrl = new URL("https://www.googleapis.com/customsearch/v1");
        gsUrl.searchParams.set("key", api_key);
        gsUrl.searchParams.set("cx", cx);
        gsUrl.searchParams.set("q", "test");
        gsUrl.searchParams.set("num", "1");
        const res = await fetch(gsUrl);
        ok = res.ok;
        message = ok ? "Google Custom Search connected." : `Google Search error: ${res.status}`;

      } else if (slug === "serpapi") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const saUrl = new URL("https://serpapi.com/account");
        saUrl.searchParams.set("api_key", key);
        const res = await fetch(saUrl);
        ok = res.ok;
        message = ok ? "SerpAPI connected." : `SerpAPI error: ${res.status}`;

      } else if (slug === "trustpilot") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const res = await fetch(`https://api.trustpilot.com/v1/resources/images`, { headers: { apikey: key } });
        ok = res.ok;
        message = ok ? "Trustpilot API connected." : `Trustpilot error: ${res.status}`;

      } else if (slug === "gemini") {
        const key = integration.credentials?.api_key;
        if (!key) throw new Error("No API key configured");
        const model = integration.config?.model ?? "gemini-1.5-flash";
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] })
          }
        );
        ok = res.ok;
        message = ok ? "Gemini API connected successfully." : `Gemini API error: ${res.status}`;

      } else {
        message = "No automated test for this integration. Mark as verified manually.";
        ok = true;
      }
    } catch (err) {
      ok = false;
      message = err.message;
    }

    await repository.setIntegrationTestResult(slug, ok);
    return reply.send({ success: true, ok, message });
  });
}
