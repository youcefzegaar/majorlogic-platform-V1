import { sendTelegramAlert } from "../../../monitoring/telegram.js";
import { getValidDomains } from "../../../registry.js";

export default async function decisionRoutes(fastify, { isProd }) {
  fastify.post("/:domain/decision/run", {
    schema: {
      body: {
        type: "object",
        properties: {
          id: { type: "string" },
          major: { type: "string" },
          locale: { type: "string" },
          budgetUsd: { type: "number", minimum: 100, maximum: 20000 },
          preferences: { type: "object", additionalProperties: true },
          sliders: { type: "object", additionalProperties: true },
          context: { type: "object", additionalProperties: true },
          productIntent: { type: "object", additionalProperties: true }
        },
        required: ["major", "budgetUsd"]
      }
    }
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    try {
      const { getDomainController } = await import("../../../registry.js");
      const controller = getDomainController(domain);
      const result = await controller.runPipeline(request.body);

      // Instant governance alert — fire-and-forget, never blocks response
      const cert = result?.integrityCertificate;
      if (cert && !cert.overallPassed) {
        const failedIds = cert.guards
          .filter(g => !g.passed)
          .map(g => `• ${g.id} (${g.severity})`)
          .join('\n');
        sendTelegramAlert(
          `⚠️ *انتهاك نزاهة — MajorLogic*\n\n` +
          `النزاهة: ${cert.integrityScore}% | قرار: \`${cert.decisionRunId ?? 'unknown'}\`\n\n` +
          `حراس فاشلة:\n${failedIds}`
        );
      }

      return reply.send(result);
    } catch (err) {
      request.log.error({ err, domain }, "Decision run failed");
      return reply.status(500).send({
        error: "decision_run_failed",
        message: isProd ? "Internal Server Error" : err.message
      });
    }
  });

  fastify.post("/:domain/decision/simulate", {
    schema: {
      body: {
        type: "object",
        properties: {
          major: { type: "string" },
          locale: { type: "string" },
          budgetUsd: { type: "number", minimum: 100, maximum: 20000 },
          preferences: { type: "object", additionalProperties: true },
          sliders: { type: "object", additionalProperties: true },
          context: { type: "object", additionalProperties: true },
          productIntent: { type: "object", additionalProperties: true }
        },
        required: ["major", "budgetUsd"]
      }
    }
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    try {
      const { getDomainController } = await import("../../../registry.js");
      const controller = getDomainController(domain);
      const result = await controller.runPipeline(request.body);
      return reply.send({
        schemaVersion: result.schemaVersion ?? 2,
        cards: result.decision?.cards?.map(c => ({
          entityId: c.entityId,
          cardType: c.cardType,
          title: c.title,
          score: c.score,
          priceUsd: c.priceUsd,
          explanation: c.explanation ?? null,
        })) ?? [],
        status: result.decision?.status ?? 'ok',
      });
    } catch (err) {
      request.log.error({ err, domain }, "Simulate failed");
      return reply.status(500).send({
        error: "simulate_failed",
        message: isProd ? "Internal Server Error" : err.message
      });
    }
  });
}
