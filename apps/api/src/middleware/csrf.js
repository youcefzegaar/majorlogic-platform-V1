/**
 * CSRF Protection — Double-Submit Cookie Pattern
 *
 * Protected route prefixes: /admin/*, /auth/*, /user/*
 *
 * On every GET request to a protected prefix: issue a random `csrf_token` cookie
 * (httpOnly: false so the browser JS / SPA can read it and send it back as a header).
 *
 * On every state-changing request (POST/PUT/DELETE) to a protected prefix:
 * verify that the `X-CSRF-Token` request header matches the `csrf_token` cookie value.
 *
 * Why double-submit cookie?
 *   - Fastify 5 does not support csurf (csurf was deprecated / removed from npm).
 *   - This pattern works without server-side session state.
 *   - An attacker on a different origin cannot read the cookie (SameSite + CORS),
 *     so they cannot forge the matching header.
 *
 * Skip-list for state-changing methods:
 *   - POST /admin/login — SSR form, SPA not yet loaded.
 *   - POST /auth/login  — user has no session yet; SameSite=Lax on user_session
 *                         cookie provides implicit cross-site protection.
 *   - POST /auth/register — same reason as login.
 *
 * Usage (in server.js):
 *   import { csrfPlugin } from './middleware/csrf.js';
 *   fastify.register(csrfPlugin);
 */

import crypto from "node:crypto";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_COOKIE  = "csrf_token";
const CSRF_HEADER  = "x-csrf-token";
const TOKEN_BYTES  = 32; // 256-bit token

// Routes that are exempt from CSRF validation on mutations.
// These are initial auth endpoints where the user has no session yet;
// SameSite=Lax on the session cookie provides adequate cross-site protection.
const CSRF_SKIP_MUTATIONS = new Set([
  "/admin/login",
  "/auth/login",
  "/auth/register",
]);

/**
 * Return true if the URL is within a CSRF-protected prefix.
 */
function isProtectedPrefix(url) {
  return (
    url.startsWith("/admin") ||
    url.startsWith("/auth")  ||
    url.startsWith("/user")
  );
}

/**
 * Generate a cryptographically random hex token.
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Fastify plugin — registers two onRequest hooks scoped to protected prefixes.
 *
 * Hook 1 (GET): ensure a fresh csrf_token cookie is set.
 * Hook 2 (mutating): validate the X-CSRF-Token header against the cookie.
 */
export async function csrfPlugin(fastify) {

  fastify.addHook("onRequest", async (req, reply) => {
    const method = req.method;
    const url    = req.raw.url?.split("?")[0] ?? "";

    if (!isProtectedPrefix(url)) return;

    // For GET requests: refresh / set the CSRF cookie when missing.
    if (method === "GET") {
      const existing = req.cookies?.[CSRF_COOKIE];
      if (!existing) {
        const isProd = process.env.NODE_ENV === "production";
        const token  = generateToken();
        // Use path: "/" so the same cookie covers /admin, /auth, and /user.
        reply.setCookie(CSRF_COOKIE, token, {
          path:     "/",
          httpOnly: false,      // security: must be readable by the SPA JS
          secure:   isProd,
          sameSite: "strict",
          maxAge:   86400,      // 24 hours
        });
      }
      return; // GET is safe — no further check needed
    }

    // security: block state-changing requests without a valid CSRF token.
    if (!STATE_CHANGING_METHODS.has(method)) return;

    // Skip CSRF check for exempt initial-auth endpoints (see module docstring).
    if (CSRF_SKIP_MUTATIONS.has(url)) return;

    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];

    if (!cookieToken || !headerToken) {
      req.log.warn({ url, method }, "[CSRF] Rejected: missing token");
      return reply.status(403).send({
        error:   "csrf_invalid",
        message: "CSRF token missing. Refresh the page and try again.",
      });
    }

    // security: constant-time comparison prevents timing-oracle attacks.
    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);

    if (
      cookieBuf.length !== headerBuf.length ||
      !crypto.timingSafeEqual(cookieBuf, headerBuf)
    ) {
      req.log.warn({ url, method, ip: req.ip }, "[CSRF] Rejected: token mismatch");
      return reply.status(403).send({
        error:   "csrf_invalid",
        message: "CSRF token mismatch. Refresh the page and try again.",
      });
    }
  });
}
