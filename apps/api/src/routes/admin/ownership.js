import { sendError, unavailable } from "../../utils/errors.js";

export default async function ownershipRoutes(fastify, _options) {

  // ── Domain Ownership Config ───────────────────────────────────────────────

  fastify.get("/domains/:domainSlug/ownership-config", async (request, reply) => {
    const { domainSlug } = request.params;
    const { getRepository } = await import("../../db/repository.js");
    const repo = await getRepository();
    if (!repo) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const { OWNERSHIP_PRESETS, DEFAULT_PRESET } = await import("../../../../../packages/ownership-strategy/src/presets.js");
    const saved = await repo.getOwnershipConfig(domainSlug);
    return reply.send({
      domainSlug,
      config: saved ?? DEFAULT_PRESET,
      isDefault: !saved,
      presets: OWNERSHIP_PRESETS,
    });
  });

  fastify.put("/domains/:domainSlug/ownership-config", {
    schema: {
      body: {
        type: "object",
        properties: {
          renewedDiscountRange:  { type: "array",  items: { type: "number" }, minItems: 2, maxItems: 2 },
          openBoxDiscountRange:  { type: "array",  items: { type: "number" }, minItems: 2, maxItems: 2 },
          defaultOwnershipYears: { type: "number", minimum: 0.5, maximum: 30 },
          apr:                   { type: "number", minimum: 0,   maximum: 1  },
          affiliateTag:          { type: "string", maxLength: 60 },
          marketSources:         { type: "object", additionalProperties: { type: "string" } },
          presetKey:             { type: "string", maxLength: 60 },
        },
        additionalProperties: false,
      }
    }
  }, async (request, reply) => {
    const { domainSlug } = request.params;
    const { getRepository } = await import("../../db/repository.js");
    const repo = await getRepository();
    if (!repo) return sendError(reply, unavailable("Database is not available", "db_offline"));
    const username = request.user?.username ?? "admin";
    await repo.saveOwnershipConfig(domainSlug, request.body, username);
    return reply.send({ success: true });
  });

  fastify.get("/ownership-presets", async (_request, reply) => {
    const { OWNERSHIP_PRESETS } = await import("../../../../../packages/ownership-strategy/src/presets.js");
    return reply.send({ presets: OWNERSHIP_PRESETS });
  });
}
