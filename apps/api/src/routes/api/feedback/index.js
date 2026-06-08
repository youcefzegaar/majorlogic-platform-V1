import { getValidDomains } from "../../../registry.js";

export default async function feedbackRoutes(fastify) {
  fastify.post("/:domain/feedback", {
    schema: {
      body: {
        type: "object",
        properties: {
          decisionRunId: { type: "string", minLength: 1 },
          score: { type: "integer", minimum: 1, maximum: 5 },
          comment: { type: "string", maxLength: 1000 },
          tags: { type: "array", items: { type: "string" }, maxItems: 20 }
        },
        required: ["decisionRunId", "score"]
      }
    }
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    const { decisionRunId, score, comment, tags } = request.body;
    try {
      const { getRepository, getUsersRepository } = await import("../../../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline" });

      // Attach to user account when logged in (session cookie — best-effort, never blocks feedback)
      let userId = null;
      try {
        const rawToken = request.cookies?.user_session;
        if (rawToken) {
          const crypto = await import("node:crypto");
          const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
          const usersRepo = await getUsersRepository();
          if (usersRepo) {
            const user = await usersRepo.getUserBySessionToken(tokenHash);
            userId = user?.id ?? null;
          }
        }
      } catch { /* session lookup is best-effort */ }

      await repository.saveFeedback({ decisionRunId, score, comment, tags, userId });
      return reply.send({ status: "received" });
    } catch (err) {
      request.log.error({ err, decisionRunId }, "Feedback save failed");
      return reply.status(500).send({ error: "feedback_failed" });
    }
  });

  // Receives the user's regret-check answer from the day-30 email.
  fastify.post("/:domain/feedback/regret", {
    schema: {
      body: {
        type: "object",
        properties: {
          decisionRunId: { type: "string", minLength: 1, maxLength: 80 },
          answer: { type: "string", enum: ["happy", "surprised", "regret"] },
        },
        required: ["decisionRunId", "answer"],
        additionalProperties: false,
      }
    }
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    const { decisionRunId, answer } = request.body;
    try {
      const { getRepository } = await import("../../../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline" });

      let sacrificeShown = null;
      try {
        sacrificeShown = await repository.getSacrificeGuardForRun(decisionRunId);
      } catch { /* certificate lookup is best-effort */ }

      await repository.saveRegretAnswer({ decisionRunId, domainId: domain, answer, sacrificeShown });
      return reply.send({ status: "received" });
    } catch (err) {
      request.log.error({ err, decisionRunId, answer }, "Regret answer save failed");
      return reply.status(500).send({ error: "regret_save_failed" });
    }
  });
}
