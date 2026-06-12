import { getValidDomains } from "../../../registry.js";

export default async function telemetryRoutes(fastify) {
  fastify.post("/:domain/telemetry/click", {
    config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    schema: {
      body: {
        type: "object",
        required: ["decisionRunId", "entityId"],
        additionalProperties: false,
        properties: {
          decisionRunId: { type: "string", minLength: 1, maxLength: 100 },
          entityId:      { type: "string", minLength: 1, maxLength: 100 },
          clickType:     { type: "string", enum: ["buy_now_clicked", "learn_more_clicked", "affiliate_clicked"], default: "buy_now_clicked" },
        },
      },
    },
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    const { decisionRunId, entityId, clickType = "buy_now_clicked" } = request.body;

    if (!decisionRunId || !entityId) {
      return reply.status(400).send({ error: "missing_telemetry_fields", message: "decisionRunId and entityId required" });
    }

    try {
      const { getRepository } = await import("../../../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline_for_telemetry" });
      await repository.saveTelemetryClick({ decisionRunId, entityId, clickType });
      return reply.send({ ok: true, logged: true, entityId });
    } catch (err) {
      request.log.error({ err }, "Telemetry click logging failed");
      return reply.status(500).send({ error: "telemetry_logging_failed" });
    }
  });
}
