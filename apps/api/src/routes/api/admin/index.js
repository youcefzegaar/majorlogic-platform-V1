export default async function adminRoutes(fastify) {
  fastify.get("/:domain/admin/dashboard", async (request, reply) => {
    const { domain } = request.params;

    // SEC-02 fix: This endpoint exposes admin data — require admin JWT auth.
    // The /admin/* hook in server.js only protects paths starting with /admin,
    // but this route is under /api/v1/ so it needs its own auth check.
    try {
      const token = request.cookies?.admin_token;
      if (!token) throw new Error("No token");
      request.server.jwt.verify(token);
    } catch {
      return reply.status(401).send({ error: "unauthorized", message: "Admin authentication required." });
    }

    try {
      const { getDomainController } = await import("../../../registry.js");
      const controller = getDomainController(domain);
      const data = await controller.buildAdminDashboardData();
      if (!data) return reply.status(503).send({ error: "database_unavailable" });
      return reply.send(data);
    } catch (err) {
      request.log.error({ err, domain }, "Admin dashboard request failed");
      return reply.status(500).send({ error: "admin_request_failed" });
    }
  });
}
