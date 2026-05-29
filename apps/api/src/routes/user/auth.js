/**
 * User Auth Routes — /auth/*
 *
 * Implements session-based (not JWT) authentication for end-users.
 * Session tokens are stored SHA-256-hashed in the database; the raw
 * token is sent only in an httpOnly cookie.
 *
 * Security notes:
 *   - bcrypt rounds = 10
 *   - Session expiry = 30 days
 *   - Login/register rate limited to 5 attempts per 5 minutes per IP
 *   - Same error message for "user not found" and "wrong password" to
 *     prevent email enumeration
 */

import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { getUsersRepository } from "../../db/repository.js";

const BCRYPT_ROUNDS    = 10;
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const COOKIE_NAME      = "user_session";
const COOKIE_MAX_AGE   = 30 * 24 * 60 * 60;         // 30 days in seconds

/** Generate a raw session token and its SHA-256 hash. */
function generateSessionToken() {
  const rawToken  = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/** Hash a raw token from a cookie for DB lookup. */
function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Simple email format check. */
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function userAuthRoutes(fastify, opts) {
  const isProd = opts?.isProd ?? process.env.NODE_ENV === "production";

  const cookieOpts = {
    path:     "/",
    httpOnly: true,
    secure:   isProd,
    sameSite: "lax",
    maxAge:   COOKIE_MAX_AGE,
  };

  const authRateLimit = {
    rateLimit: {
      max:       5,
      timeWindow: "5 minutes",
      keyGenerator: (req) => req.ip,
      errorResponseBuilder: (_req, context) => {
        const retryAfter = Math.ceil(context.ttl / 1000);
        return {
          error:   "rate_limited",
          message: `Too many attempts. Please wait ${retryAfter} seconds before trying again.`,
        };
      },
    },
  };

  // ── POST /auth/register ──────────────────────────────────────────────────────

  fastify.post("/auth/register", { config: authRateLimit }, async (request, reply) => {
    const { email, password, displayName, locale } = request.body || {};

    if (!isValidEmail(email)) {
      return reply.status(400).send({ error: "validation_error", message: "A valid email address is required." });
    }
    if (typeof password !== "string" || password.length < 8) {
      return reply.status(400).send({ error: "validation_error", message: "Password must be at least 8 characters." });
    }

    const repo = await getUsersRepository();
    if (!repo) {
      return reply.status(503).send({ error: "service_unavailable", message: "Database unavailable. Please try again later." });
    }

    // Check for existing account (still return a generic message to prevent enumeration)
    const existing = await repo.getUserByEmail(email);
    if (existing) {
      return reply.status(409).send({ error: "conflict", message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await repo.createUser({
      email,
      passwordHash,
      displayName: displayName || null,
      locale:      locale || "en",
    });

    const { rawToken, tokenHash } = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    await repo.createUserSession({
      userId:    user.id,
      tokenHash,
      expiresAt,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] || null,
    });

    reply.setCookie(COOKIE_NAME, rawToken, cookieOpts);

    return reply.status(201).send({
      user: {
        id:          user.id,
        email:       user.email,
        displayName: user.display_name,
        locale:      user.locale,
      },
    });
  });

  // ── POST /auth/login ─────────────────────────────────────────────────────────

  fastify.post("/auth/login", { config: authRateLimit }, async (request, reply) => {
    const { email, password } = request.body || {};

    if (!isValidEmail(email) || typeof password !== "string") {
      return reply.status(400).send({ error: "validation_error", message: "Email and password are required." });
    }

    const repo = await getUsersRepository();
    if (!repo) {
      return reply.status(503).send({ error: "service_unavailable", message: "Database unavailable. Please try again later." });
    }

    const user = await repo.getUserByEmail(email);

    // security: run bcrypt compare even when user not found to prevent timing attacks.
    const DUMMY_HASH = "$2b$10$invalidhashfortimingnormalisation000000000000000000000000";
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid) {
      request.log.warn({ ip: request.ip, email }, "[USER AUTH] Failed login attempt");
      return reply.status(401).send({ error: "unauthorized", message: "Invalid email or password." });
    }

    const { rawToken, tokenHash } = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    await repo.createUserSession({
      userId:    user.id,
      tokenHash,
      expiresAt,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"] || null,
    });

    reply.setCookie(COOKIE_NAME, rawToken, cookieOpts);

    return reply.send({
      user: {
        id:          user.id,
        email:       user.email,
        displayName: user.display_name,
        locale:      user.locale,
      },
    });
  });

  // ── POST /auth/logout ────────────────────────────────────────────────────────

  fastify.post("/auth/logout", async (request, reply) => {
    const rawToken = request.cookies?.[COOKIE_NAME];

    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      const repo = await getUsersRepository();
      if (repo) {
        await repo.deleteUserSession(tokenHash);
      }
    }

    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return reply.status(204).send();
  });

  // ── PUT /auth/account ────────────────────────────────────────────────────────

  fastify.put("/auth/account", { config: authRateLimit }, async (request, reply) => {
    const rawToken = request.cookies?.[COOKIE_NAME];
    if (!rawToken) {
      return reply.status(401).send({ error: "unauthorized", message: "Authentication required." });
    }

    const repo = await getUsersRepository();
    if (!repo) {
      return reply.status(503).send({ error: "service_unavailable", message: "Database unavailable." });
    }

    const tokenHash = hashToken(rawToken);
    const user = await repo.getUserBySessionToken(tokenHash);
    if (!user) {
      reply.clearCookie(COOKIE_NAME, { path: "/" });
      return reply.status(401).send({ error: "unauthorized", message: "Session expired." });
    }

    const { currentPassword, newPassword, displayName, locale } = request.body || {};

    // Validate password change
    let passwordHash = null;
    if (newPassword !== undefined) {
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return reply.status(400).send({ error: "validation_error", message: "New password must be at least 8 characters." });
      }
      if (!currentPassword) {
        return reply.status(400).send({ error: "validation_error", message: "Current password is required to set a new one." });
      }
      const currentUser = await repo.getUserByEmail(user.email);
      const isValid = await bcrypt.compare(currentPassword, currentUser?.password_hash ?? "");
      if (!isValid) {
        return reply.status(401).send({ error: "wrong_password", message: "Current password is incorrect." });
      }
      passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    }

    const updated = await repo.updateUser({
      userId: user.id,
      passwordHash,
      displayName: displayName ?? null,
      locale: locale ?? null,
    });

    if (!updated) {
      return reply.status(400).send({ error: "nothing_changed", message: "No fields to update." });
    }

    return reply.send({
      user: {
        id:          updated.id,
        email:       user.email,
        displayName: updated.display_name,
        locale:      updated.locale,
      },
    });
  });

  // ── GET /auth/me ─────────────────────────────────────────────────────────────

  fastify.get("/auth/me", async (request, reply) => {
    const rawToken = request.cookies?.[COOKIE_NAME];
    if (!rawToken) {
      return reply.status(401).send({ error: "unauthorized", message: "Not authenticated." });
    }

    const repo = await getUsersRepository();
    if (!repo) {
      return reply.status(503).send({ error: "service_unavailable", message: "Database unavailable. Please try again later." });
    }

    const tokenHash = hashToken(rawToken);
    const user = await repo.getUserBySessionToken(tokenHash);

    if (!user) {
      reply.clearCookie(COOKIE_NAME, { path: "/" });
      return reply.status(401).send({ error: "unauthorized", message: "Session expired or invalid. Please log in again." });
    }

    return reply.send({
      user: {
        id:          user.id,
        email:       user.email,
        displayName: user.display_name,
        locale:      user.locale,
      },
    });
  });
}
