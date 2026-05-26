import path from "node:path";
import { fileURLToPath } from "node:url";

import auth         from "./auth.js";
import dashboard    from "./dashboard.js";
import integrations from "./integrations.js";
import settings     from "./settings.js";
import catalog      from "./catalog.js";
import ownership    from "./ownership.js";

const __dirname    = path.dirname(fileURLToPath(import.meta.url));
const adminDistDir = path.resolve(__dirname, "../../../../admin-ui/dist");

export const AUDIT_ACTIONS = [
  { method: "POST",   pattern: /^\/admin\/login$/,                             action: "login" },
  { method: "GET",    pattern: /^\/admin\/logout$/,                            action: "logout" },
  { method: "POST",   pattern: /^\/admin\/account\/password\/json$/,           action: "change_password" },
  { method: "POST",   pattern: /^\/admin\/logic-config\//,                     action: "save_logic" },
  { method: "POST",   pattern: /^\/admin\/simulate$/,                          action: "simulate" },
  { method: "POST",   pattern: /^\/admin\/affiliate-settings$/,                action: "update_affiliate" },
  { method: "GET",    pattern: /^\/admin\/export-trigger\//,                   action: "export_leads" },
  { method: "GET",    pattern: /^\/admin\/export-token$/,                      action: "export_token" },
  { method: "POST",   pattern: /^\/admin\/integrations\/[^/]+$/,               action: "update_integration" },
  { method: "POST",   pattern: /^\/admin\/integrations$/,                      action: "add_integration" },
  { method: "DELETE", pattern: /^\/admin\/integrations\/[^/]+\/credentials$/,  action: "revoke_integration" },
  { method: "POST",   pattern: /^\/admin\/integrations\/[^/]+\/test$/,         action: "test_integration" },
  { method: "POST",   pattern: /^\/admin\/catalog\/rebuild$/,                  action: "catalog_rebuild" },
];

export function getAuditAction(method, url) {
  const urlPath = url.split("?")[0];
  const match = AUDIT_ACTIONS.find(a => a.method === method && a.pattern.test(urlPath));
  return match?.action ?? null;
}

export default async function adminRoutes(fastify, { DEFAULT_DOMAIN }) {
  // ── Audit Log Hook ────────────────────────────────────────────────────────
  // Registered on parent scope — Fastify propagates it to all child plugin scopes.
  fastify.addHook("onResponse", async (req, reply) => {
    const action = getAuditAction(req.method, req.raw.url ?? "");
    if (!action) return;
    const username = req.user?.username ?? (action === "login" ? (req.body?.username ?? "unknown") : "unknown");
    const status   = reply.statusCode < 400 ? "success" : "error";
    try {
      const { getRepository } = await import("../../db/repository.js");
      const repo = await getRepository();
      if (!repo) return;
      const resource = req.params?.domainId ?? req.params?.domain ?? null;
      const details  = {};
      if (action === "save_logic"   && req.body?.version)   details.version  = req.body.version;
      if (action === "simulate"     && req.body?.domainId)  details.domainId = req.body.domainId;
      if (action === "export_leads") details.domain = req.params?.domain ?? DEFAULT_DOMAIN;
      await repo.logAuditEvent({ username, action, resource, details, ip: req.ip, status });
    } catch (err) {
      req.log.warn(err, "audit-log write failed");
    }
  });

  fastify.register(auth,         { DEFAULT_DOMAIN });
  fastify.register(dashboard,    { DEFAULT_DOMAIN });
  fastify.register(integrations, { DEFAULT_DOMAIN });
  fastify.register(settings,     { DEFAULT_DOMAIN });
  fastify.register(catalog,      { DEFAULT_DOMAIN });
  fastify.register(ownership,    { DEFAULT_DOMAIN });

  // ── SPA Catch-all (must be last) ─────────────────────────────────────────
  // Serves React SPA index.html for all /admin/* routes not matched above.
  fastify.get("/*", async (_request, reply) => {
    return reply.sendFile("index.html", adminDistDir);
  });
}
