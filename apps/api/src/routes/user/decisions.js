/**
 * User Decisions & Price Alerts Routes — /user/*
 *
 * All routes require a valid user session (user_session cookie).
 * The requireUser helper resolves the session token to a user row
 * and returns 401 if not authenticated.
 */

import crypto from "node:crypto";
import { getUsersRepository } from "../../db/repository.js";

const COOKIE_NAME = "user_session";

/**
 * Resolve the user_session cookie to a user row.
 * Returns null and sends 401 if not authenticated.
 */
async function requireUser(request, reply) {
  const rawToken = request.cookies?.[COOKIE_NAME];
  if (!rawToken) {
    reply.status(401).send({ error: "unauthorized", message: "Authentication required." });
    return null;
  }

  const repo = await getUsersRepository();
  if (!repo) {
    reply.status(503).send({ error: "service_unavailable", message: "Database unavailable. Please try again later." });
    return null;
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const user = await repo.getUserBySessionToken(tokenHash);

  if (!user) {
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    reply.status(401).send({ error: "unauthorized", message: "Session expired or invalid. Please log in again." });
    return null;
  }

  return { user, repo };
}

export default async function userDecisionsRoutes(fastify, _opts) {

  // ── POST /user/decisions ─────────────────────────────────────────────────────

  fastify.post("/user/decisions", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const { domain, irHash, title, profileSnapshot, decisionSnapshot, notes } = request.body || {};

    if (!domain || typeof domain !== "string") {
      return reply.status(400).send({ error: "validation_error", message: "domain is required." });
    }
    if (!title || typeof title !== "string") {
      return reply.status(400).send({ error: "validation_error", message: "title is required." });
    }
    if (!profileSnapshot || typeof profileSnapshot !== "object") {
      return reply.status(400).send({ error: "validation_error", message: "profileSnapshot must be an object." });
    }
    if (!decisionSnapshot || typeof decisionSnapshot !== "object") {
      return reply.status(400).send({ error: "validation_error", message: "decisionSnapshot must be an object." });
    }

    const decision = await repo.saveDecision({
      userId:           user.id,
      domain,
      irHash:           irHash || null,
      title,
      profileSnapshot,
      decisionSnapshot,
      notes:            notes || null,
    });

    return reply.status(201).send({ decision });
  });

  // ── GET /user/decisions ──────────────────────────────────────────────────────

  fastify.get("/user/decisions", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const limit  = Math.min(parseInt(request.query?.limit  ?? "20", 10), 100);
    const offset = parseInt(request.query?.offset ?? "0",  10);

    const decisions = await repo.listDecisions(user.id, { limit, offset });
    return reply.send({ decisions });
  });

  // ── GET /user/decisions/:id ──────────────────────────────────────────────────

  fastify.get("/user/decisions/:id", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const decision = await repo.getDecision(request.params.id, user.id);
    if (!decision) {
      return reply.status(404).send({ error: "not_found", message: "Decision not found." });
    }
    return reply.send({ decision });
  });

  // ── DELETE /user/decisions/:id ───────────────────────────────────────────────

  fastify.delete("/user/decisions/:id", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const deleted = await repo.deleteDecision(request.params.id, user.id);
    if (!deleted) {
      return reply.status(404).send({ error: "not_found", message: "Decision not found." });
    }
    return reply.status(204).send();
  });

  // ── POST /user/price-alerts ──────────────────────────────────────────────────

  fastify.post("/user/price-alerts", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const { entityId, domain, targetPrice, currentPrice } = request.body || {};

    if (!entityId || typeof entityId !== "string") {
      return reply.status(400).send({ error: "validation_error", message: "entityId is required." });
    }

    const alert = await repo.upsertPriceAlert({
      userId:       user.id,
      entityId,
      domain:       domain || "laptop-student-us",
      targetPrice:  targetPrice ?? null,
      currentPrice: currentPrice ?? null,
    });

    return reply.status(201).send({ alert });
  });

  // ── GET /user/price-alerts ───────────────────────────────────────────────────

  fastify.get("/user/price-alerts", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const alerts = await repo.listPriceAlerts(user.id);
    return reply.send({ alerts });
  });

  // ── DELETE /user/price-alerts/:id ───────────────────────────────────────────

  fastify.delete("/user/price-alerts/:id", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const deleted = await repo.deletePriceAlert(request.params.id, user.id);
    if (!deleted) {
      return reply.status(404).send({ error: "not_found", message: "Price alert not found." });
    }
    return reply.status(204).send();
  });

  // ── POST /user/decisions/:id/share ──────────────────────────────────────────

  fastify.post("/user/decisions/:id/share", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const decision = await repo.getDecision(request.params.id, user.id);
    if (!decision) {
      return reply.status(404).send({ error: "not_found", message: "Decision not found." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const link = await repo.createSharedLink({
      token,
      decisionId: decision.id,
      userId:     user.id,
      irHash:     decision.ir_hash || null,
      snapshot:   decision.decision_snapshot || {},
      title:      decision.title,
      domain:     decision.domain,
      expiresAt,
    });

    const BASE_URL = process.env.BASE_URL || "https://majorlogic.ai";
    return reply.status(201).send({ shareUrl: `${BASE_URL}/share/${link.token}`, expiresAt: link.expires_at });
  });

  // ── DELETE /user/decisions/:id/share ────────────────────────────────────────

  fastify.delete("/user/decisions/:id/share", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const decision = await repo.getDecision(request.params.id, user.id);
    if (!decision) {
      return reply.status(404).send({ error: "not_found", message: "Decision not found." });
    }

    await repo.revokeSharedLink(decision.id, user.id);
    return reply.status(204).send();
  });

  // ── GET /user/feedback ───────────────────────────────────────────────────────

  fastify.get("/user/feedback", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const items = await repo.getUserFeedback(user.id);
    return reply.send({ feedback: items });
  });

  // ── DELETE /user/feedback/:id ────────────────────────────────────────────────

  fastify.delete("/user/feedback/:id", async (request, reply) => {
    const auth = await requireUser(request, reply);
    if (!auth) return;
    const { user, repo } = auth;

    const deleted = await repo.deleteUserFeedback(request.params.id, user.id);
    if (!deleted) {
      return reply.status(404).send({ error: "not_found", message: "Feedback not found or not yours." });
    }
    return reply.status(204).send();
  });
}
