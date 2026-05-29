/**
 * User Routes Index — registers all /auth/* and /user/* route plugins.
 */

import userAuthRoutes from "./auth.js";
import userDecisionsRoutes from "./decisions.js";

export default async function userRoutes(fastify, opts) {
  fastify.register(userAuthRoutes,      opts);
  fastify.register(userDecisionsRoutes, opts);
}
