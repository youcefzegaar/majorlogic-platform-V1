// apps/api/src/plugins/health.js
import fp from 'fastify-plugin';

export default fp(async function healthPlugin(fastify) {
  fastify.get('/liveness', async (_req, reply) => {
    return reply.send({ ok: true, uptime: process.uptime() });
  });

  fastify.get('/readiness', async (_req, reply) => {
    try {
      const { getRepository } = await import('../db/repository.js');
      const repo = await getRepository();
      if (!repo) return reply.status(503).send({ ok: false, reason: 'db_not_configured' });
      await repo.pool.query('SELECT 1');
      return reply.send({ ok: true, db: 'connected' });
    } catch (err) {
      fastify.log.warn({ err }, 'Readiness check failed');
      return reply.status(503).send({ ok: false, reason: 'db_unavailable' });
    }
  });
});
