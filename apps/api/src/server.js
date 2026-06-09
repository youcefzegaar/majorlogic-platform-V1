import "./telemetry.js"; // Must be first import — OpenTelemetry SDK init (v3)
import { initSentry, sentryPlugin } from "./monitoring/sentry.js";
import { alertStartup } from "./monitoring/telegram.js";
initSentry(); // before anything else so errors during startup are captured

import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyFormbody from "@fastify/formbody";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";

import { loadEnvFile } from "../../../scripts/env.js";
import { loadJsonSync, getRepository } from "./db/repository.js";
import { validateEnv } from "./config/validate-env.js";

import adminRoutes from "./routes/admin/index.js";
import apiRoutes from "./routes/api/index.js";
import webRoutes from "./routes/web.js";
import userRoutes from "./routes/user/index.js";
import { csrfPlugin } from "./middleware/csrf.js";
import healthPlugin from "./plugins/health.js";
import { registerSecurity } from "./plugins/security.js";
import { registerAdminAuth } from "./plugins/admin-auth.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { startBackgroundJobs } from "./jobs/startup.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
loadEnvFile(path.join(root, ".env"));

validateEnv();

const isProd = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3010);
const DEFAULT_DOMAIN = process.env.DEFAULT_DOMAIN ?? "laptop-student-us";
const clientOrigin = process.env.CLIENT_ORIGIN ?? process.env.FRONTEND_URL ?? 'http://localhost:5173';
const FRONTEND_URL = clientOrigin;
const defaultProfile = loadJsonSync("examples/profile.json");

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
    transport: isProd ? undefined : { target: "pino-pretty" }
  }
});

// ── Security Headers + CORS ───────────────────────────────────────────────────
const ALLOWED_ORIGINS = isProd
  ? (process.env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean)
  : [
      "https://majorlogic.ai",
      "https://www.majorlogic.ai",
      "http://localhost:3010", "http://127.0.0.1:3010",
      "http://localhost:5173", "http://localhost:5174",
      "http://localhost:5175", "http://localhost:5176"
    ];

registerSecurity(fastify, { allowedOrigins: ALLOWED_ORIGINS });

// ── Body & Cookies ────────────────────────────────────────────────────────────
fastify.register(fastifyFormbody);
fastify.register(fastifyJwt, {
  secret: process.env.JWT_SECRET,
  cookie: { cookieName: "admin_token", signed: false }
});
fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET,
  hook: "onRequest"
});

// ── CSRF Protection ───────────────────────────────────────────────────────────
// security: double-submit cookie pattern for all state-changing /admin/* routes.
// Must be registered after fastifyCookie so req.cookies is available.
fastify.register(csrfPlugin);

// ── Rate Limiting ─────────────────────────────────────────────────────────────
await fastify.register(fastifyRateLimit, {
  global: true,
  max: 120,
  timeWindow: "1 minute",
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: () => ({
    error: "too_many_requests",
    message: "Too many requests. Please slow down."
  })
});

// ── Static Files ──────────────────────────────────────────────────────────────
fastify.register(fastifyStatic, {
  root: path.join(__dirname, "..", "public"),
  prefix: "/public/",
});

// Serve built admin-ui SPA assets (js, css, icons, favicon)
// Must be registered before the admin catch-all route
fastify.register(fastifyStatic, {
  root: path.resolve(__dirname, "../../admin-ui/dist"),
  prefix: "/admin/",
  wildcard: false,
  decorateReply: false,
});

// ── Auth, Error Handling, Monitoring ─────────────────────────────────────────
registerAdminAuth(fastify);
registerErrorHandler(fastify, { isProd });
fastify.register(sentryPlugin);
fastify.register(healthPlugin);

// ── Routes ────────────────────────────────────────────────────────────────────
fastify.register(adminRoutes, { prefix: "/admin", DEFAULT_DOMAIN });
fastify.register(apiRoutes,   { isProd });
fastify.register(webRoutes,   { root, port, FRONTEND_URL, DEFAULT_DOMAIN, defaultProfile });
fastify.register(userRoutes,  { isProd });

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  fastify.log.info(`[shutdown] Received ${signal} — closing server gracefully`);
  try {
    await fastify.close();
    fastify.log.info("[shutdown] Server closed. Exiting.");
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, "[shutdown] Error during close");
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await fastify.listen({ port, host: "0.0.0.0" });
    fastify.log.info(`MajorLogic API running on http://localhost:${port}`);
    alertStartup(port);
    const repo = await getRepository();
    if (repo) startBackgroundJobs(fastify, repo);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
