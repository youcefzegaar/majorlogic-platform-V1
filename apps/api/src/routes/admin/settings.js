import { sendError, unavailable } from "../../utils/errors.js";

export default async function settingsRoutes(fastify) {

  // ── Affiliate Settings ────────────────────────────────────────────────────

  fastify.get("/affiliate-settings", async (_request, reply) => {
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const settings = await repository.getAffiliateSettings();
    return reply.send({ success: true, settings });
  });

  fastify.post("/affiliate-settings", {
    schema: {
      body: {
        type: "object",
        properties: {
          seller:       { type: "string", minLength: 1, maxLength: 100 },
          affiliateTag: { type: "string", minLength: 1, maxLength: 50 },
          isActive:     { type: "boolean" },
          notes:        { type: "string", maxLength: 500 },
        },
        required: ["seller", "affiliateTag"],
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { seller, affiliateTag, isActive, notes } = request.body;
    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    await repository.saveAffiliateTag({ seller, affiliateTag, isActive, notes });
    return reply.send({ success: true });
  });

  // ── Logic Config ──────────────────────────────────────────────────────────

  fastify.get("/logic-config/:domainId", async (request, reply) => {
    const { domainId } = request.params;
    const { getRuleset } = await import("../../db/repository.js");
    const config = await getRuleset(`domains/${domainId}/decision-config.json`);
    return reply.send({ success: true, config });
  });

  fastify.post("/logic-config/:domainId", {
    schema: {
      body: {
        type: "object",
        properties: {
          version:  { type: "string", maxLength: 20 },
          gates:    { type: "object", additionalProperties: true },
          rulesets: { type: "object", additionalProperties: true }
        },
        required: ["version"],
        additionalProperties: true,
        maxProperties: 200
      }
    }
  }, async (request, reply) => {
    const { domainId } = request.params;
    const config = request.body;
    const { getRepository, clearRulesetCache } = await import("../../db/repository.js");
    const repository = await getRepository();
    if (!repository) return sendError(reply, unavailable("Database is not available", "db_offline"));
    await repository.saveDecisionLogic(domainId, config);
    clearRulesetCache();
    return reply.send({ success: true, version: config.version });
  });
}
