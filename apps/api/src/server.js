import "./telemetry.js"; // Must be first import — OpenTelemetry SDK init

import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import cors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyFormbody from "@fastify/formbody";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";

import { loadEnvFile } from "../../../scripts/env.js";
import { loadJsonSync } from "./db/repository.js";
import { validateEnv } from "./config/validate-env.js";

import adminRoutes from "./routes/admin.js";
import apiRoutes from "./routes/api.js";
import webRoutes from "./routes/web.js";
import { csrfPlugin } from "./middleware/csrf.js";
import healthPlugin from "./plugins/health.js";

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

// ── Security Headers ──────────────────────────────────────────────────────────
fastify.register(fastifyHelmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc:      ["'self'", "data:", "https:"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc:     ["'self'", "https://cdnjs.cloudflare.com"],
      frameAncestors: ["'none'"],
      baseUri:     ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: "deny" },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

// ── CORS ──────────────────────────────────────────────────────────────────────
// security: in production, only origins listed in ALLOWED_ORIGINS env var are
// permitted. localhost entries are never included in production to avoid
// cross-origin leaks from attacker-controlled local pages.
const ALLOWED_ORIGINS = isProd
  ? (process.env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean)
  : [
      "https://majorlogic.ai",
      "https://www.majorlogic.ai",
      "http://localhost:3010", "http://127.0.0.1:3010",
      "http://localhost:5173", "http://localhost:5174",
      "http://localhost:5175", "http://localhost:5176"
    ];

fastify.register(cors, {
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin '${origin}' not allowed`), false);
    }
  },
  credentials: true
});

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

// ── Admin Auth Hook ───────────────────────────────────────────────────────────
// Protects /admin/* except: login page, logout, and static SPA assets
const ADMIN_PUBLIC = ["/admin/login", "/admin/logout"];
const STATIC_EXT   = /\.(js|css|svg|ico|png|woff2?|map)$/;

fastify.addHook("onRequest", async (req, reply) => {
  const url = req.raw.url.split("?")[0]; // strip query string
  if (!url.startsWith("/admin")) return;
  if (ADMIN_PUBLIC.some(p => url.startsWith(p))) return;
  if (STATIC_EXT.test(url)) return; // allow SPA asset files through

  try {
    const token = req.cookies.admin_token;
    if (!token) throw new Error("No token");
    req.user = fastify.jwt.verify(token);
  } catch (err) {
    req.log.warn({ url }, `[AUTH] Unauthorized: ${err.message}`);
    reply.redirect("/admin/login");
  }
});

// ── Global Error Handler ──────────────────────────────────────────────────────
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (error.validation) {
    return reply.status(400).send({ error: "validation_error", details: error.validation });
  }
  reply.status(500).send({
    error: "internal_error",
    message: isProd ? "A server error occurred. Please try again later." : error.message
  });
});

// ── Health Checks ─────────────────────────────────────────────────────────────
fastify.register(healthPlugin);

// ── Routes ────────────────────────────────────────────────────────────────────
fastify.register(adminRoutes, { prefix: "/admin", DEFAULT_DOMAIN });
fastify.register(apiRoutes,   { isProd });
fastify.register(webRoutes,   { root, port, FRONTEND_URL, DEFAULT_DOMAIN, defaultProfile });

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
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
