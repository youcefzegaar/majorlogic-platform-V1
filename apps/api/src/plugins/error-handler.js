import { alertServerError } from "../monitoring/telegram.js";

export function registerErrorHandler(fastify, { isProd }) {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if (error.validation) {
      return reply.status(400).send({ error: "validation_error", details: error.validation });
    }
    // Don't alert on expected client errors (rate limit, 4xx)
    if (!error.statusCode || error.statusCode >= 500) {
      alertServerError(error, request.method, request.url);
    }
    reply.status(500).send({
      error: "internal_error",
      message: isProd ? "A server error occurred. Please try again later." : error.message,
    });
  });
}
