/**
 * CSRF Protection — Double-Submit Cookie Pattern
 *
 * On every GET /admin/* request: issue a random `csrf_token` cookie (httpOnly: false
 * so the browser JS / SPA can read it and send it back as a header).
 *
 * On every state-changing request (POST/PUT/DELETE /admin/*): verify that the
 * `X-CSRF-Token` request header matches the `csrf_token` cookie value.
 *
 * Why double-submit cookie?
 *   - Fastify 5 does not support csurf (csurf was deprecated / removed from npm).
 *   - This pattern works without server-side session state.
 *   - An attacker on a different origin cannot read the cookie (SameSite + CORS),
 *     so they cannot forge the matching header.
 *
 * Usage (in server.js or adminRoutes):
 *   import { csrfPlugin } from './middleware/csrf.js';
 *   fastify.register(csrfPlugin);
 */

import crypto from "node:crypto";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const TOKEN_BYTES  = 32; // 256-bit token

/**
 * Generate a cryptographically random hex token.
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

/**
 * Fastify plugin — registers two onRequest hooks scoped to /admin/* routes.
 *
 * Hook 1 (GET): ensure a fresh csrf_token cookie is set.
 * Hook 2 (mutating): validate the X-CSRF-Token header against the cookie.
 */
export async function csrfPlugin(fastify) {

  // security: issue CSRF token cookie on every GET to /admin/* so the SPA
  // can read it and attach it to subsequent state-changing requests.
  fastify.addHook("onRequest", async (req, reply) => {
    const method = req.method;
    const url    = req.raw.url?.split("?")[0] ?? "";

    if (!url.startsWith("/admin")) return;

    // For GET requests: refresh / set the CSRF cookie when missing or on login page.
    if (method === "GET") {
      const existing = req.cookies?.[CSRF_COOKIE];
      if (!existing) {
        const isProd = process.env.NODE_ENV === "production";
        const token  = generateToken();
        reply.setCookie(CSRF_COOKIE, token, {
          path:     "/admin",
          httpOnly: false,      // security: must be readable by the SPA JS
          secure:   isProd,
          sameSite: "strict",
          maxAge:   86400,      // 24 hours (matches admin session lifetime)
        });
      }
      return; // GET is safe — no further check needed
    }

    // security: block state-changing requests without a valid CSRF token.
    if (!STATE_CHANGING_METHODS.has(method)) return;

    // Skip CSRF check for the login POST — the SPA is not yet loaded,
    // the login form is SSR-rendered and uses credential-based auth instead.
    // Login is also not a privileged admin action on its own.
    if (url === "/admin/login") return;

    const cookieToken  = req.cookies?.[CSRF_COOKIE];
    const headerToken  = req.headers[CSRF_HEADER];

    if (!cookieToken || !headerToken) {
      req.log.warn({ url, method }, "[CSRF] Rejected: missing token");
      return reply.status(403).send({
        error: "csrf_invalid",
        message: "CSRF token missing. Refresh the page and try again."
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
        error: "csrf_invalid",
        message: "CSRF token mismatch. Refresh the page and try again."
      });
    }
  });
}
