import decisionRoutes from "./decision/index.js";
import telemetryRoutes from "./telemetry/index.js";
import growthRoutes from "./growth/index.js";
import feedbackRoutes from "./feedback/index.js";
import jobRoutes from "./jobs/index.js";
import adminRoutes from "./admin/index.js";

export default async function apiRoutes(fastify, { isProd }) {
  fastify.get("/health", async (_request, reply) => {
    return reply.send({ ok: true, service: "majorlogic-api" });
  });

  fastify.register(decisionRoutes, { isProd });
  fastify.register(telemetryRoutes);
  fastify.register(growthRoutes);
  fastify.register(feedbackRoutes);
  fastify.register(jobRoutes);
  fastify.register(adminRoutes);
}
