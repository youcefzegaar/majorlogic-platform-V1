import bcrypt from "bcrypt";
import { createHmac } from "node:crypto";
import { renderLoginHtml } from "../../views/login.js";

export default async function authRoutes(fastify, _options) {

  // ── Auth (SSR — runs before React loads) ─────────────────────────────────

  fastify.get("/login", async (_request, reply) => {
    reply.type("text/html").send(renderLoginHtml({ error: null }));
  });

  fastify.post("/login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
        keyGenerator: (req) => req.ip,
        errorResponseBuilder: (req, context) => {
          const retryAfter = Math.ceil(context.ttl / 1000);
          req.log.warn({ ip: req.ip }, "[BRUTE FORCE] Login rate limit exceeded");
          return renderLoginHtml({ error: `Too many failed attempts. Please wait ${retryAfter} seconds before trying again.` });
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { username, password } = request.body || {};
      const envUser = process.env.ADMIN_USER;
      const envHash = process.env.ADMIN_PASSWORD_HASH;

      const { getRepository } = await import("../../db/repository.js");
      const repository = await getRepository();
      if (!repository) {
        return reply.type("text/html").send(renderLoginHtml({ error: "Database offline" }));
      }

      let dbUser = await repository.getAdminUser(username);

      if (username === envUser && envHash) {
        const isValidEnv = await bcrypt.compare(password, envHash);
        if (isValidEnv) {
          if (dbUser) {
            await repository.updateAdminPassword(username, envHash);
          } else {
            await repository.createAdminUser(username, envHash);
          }
          dbUser = await repository.getAdminUser(username);
        }
      }

      if (dbUser?.locked_until && new Date() < new Date(dbUser.locked_until)) {
        const remaining = Math.ceil((new Date(dbUser.locked_until) - new Date()) / 60000);
        return reply.type("text/html").send(
          renderLoginHtml({ error: `Account locked. Try again in ${remaining} minute(s).` })
        );
      }

      let isValid = false;
      if (dbUser) {
        isValid = await bcrypt.compare(password, dbUser.password_hash);
      }

      if (!isValid) {
        if (dbUser) {
          const attempts = (dbUser.failed_login_attempts || 0) + 1;
          const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
          await repository.updateLoginAttempts(username, attempts, lockedUntil);
          if (lockedUntil) {
            request.log.warn({ ip: request.ip, username }, "[SECURITY] Account locked after 5 failed attempts");
          }
        }
        return reply.type("text/html").send(renderLoginHtml({ error: "Invalid username or password" }));
      }

      await repository.resetLoginAttempts(username);

      const isProd = process.env.NODE_ENV === "production";
      const token = fastify.jwt.sign({ username });
      reply
        .setCookie("admin_token", token, {
          domain: isProd ? "majorlogic.tech" : undefined,
          path: "/",
          secure: isProd,
          httpOnly: true,
          sameSite: "strict",
          maxAge: 86400
        })
        .redirect("/admin/", 302);
    } catch (err) {
      fastify.log.error({ err, ip: request.ip }, "[LOGIN] Unexpected error in login handler");
      return reply.type("text/html").send(renderLoginHtml({ error: "An unexpected error occurred. Please try again." }));
    }
  });

  fastify.get("/logout", async (_request, reply) => {
    reply.clearCookie("admin_token", { path: "/" }).redirect("/admin/login", 302);
  });

  // ── Password (JSON API for React SPA) ────────────────────────────────────
  // Shape { success, errors[] } is intentional — consumed by the admin SPA form.

  fastify.post("/account/password/json", async (request, reply) => {
    const { currentPassword, newPassword, confirmPassword } = request.body;
    const username = request.user?.username;

    if (!username) return reply.status(401).send({ success: false, error: "Not authenticated" });

    const pwErrors = [];
    if (!newPassword || newPassword.length < 12) pwErrors.push("At least 12 characters");
    if (!/[A-Z]/.test(newPassword)) pwErrors.push("At least one uppercase letter");
    if (!/[a-z]/.test(newPassword)) pwErrors.push("At least one lowercase letter");
    if (!/[0-9]/.test(newPassword)) pwErrors.push("At least one number");
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) pwErrors.push("At least one symbol");
    if (newPassword !== confirmPassword) pwErrors.push("New passwords do not match");

    if (pwErrors.length > 0) {
      return reply.status(400).send({ success: false, errors: pwErrors });
    }

    const { getRepository } = await import("../../db/repository.js");
    const repository = await getRepository();
    const dbUser = await repository.getAdminUser(username);

    if (!dbUser) return reply.status(404).send({ success: false, error: "User not found" });

    const isValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isValid) {
      return reply.status(400).send({ success: false, errors: ["Current password is incorrect"] });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await repository.updateAdminPassword(username, newHash);
    return reply.send({ success: true, message: "Password updated successfully" });
  });

  // ── Export Tokens ─────────────────────────────────────────────────────────

  fastify.get("/export-token", async (_request, reply) => {
    const expires = Date.now() + 5 * 60 * 1000;
    const sig = createHmac("sha256", process.env.ADMIN_EXPORT_SECRET)
      .update(String(expires)).digest("hex");
    return reply.send({ token: `${expires}.${sig}`, expiresIn: 300 });
  });

  fastify.get("/export-trigger/:domain", async (request, reply) => {
    const expires = Date.now() + 5 * 60 * 1000;
    const sig = createHmac("sha256", process.env.ADMIN_EXPORT_SECRET)
      .update(String(expires)).digest("hex");
    const token = `${expires}.${sig}`;
    const { domain } = request.params;
    reply.redirect(`/api/v1/${domain}/growth/leads/export?token=${token}`, 302);
  });
}
