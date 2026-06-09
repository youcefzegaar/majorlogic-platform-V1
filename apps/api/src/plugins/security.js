import fastifyHelmet from "@fastify/helmet";
import cors from "@fastify/cors";

export function registerSecurity(fastify, { allowedOrigins }) {
  fastify.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        imgSrc:         ["'self'", "data:", "https:"],
        scriptSrc:      ["'self'", "https://cdnjs.cloudflare.com"],
        fontSrc:        ["'self'", "https://cdnjs.cloudflare.com"],
        frameAncestors: ["'none'"],
        baseUri:        ["'self'"],
      },
    },
    hsts:           { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard:     { action: "deny" },
    noSniff:        true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });

  // security: in production, only origins listed in allowedOrigins are permitted.
  // localhost entries are never included in production to avoid cross-origin leaks
  // from attacker-controlled local pages.
  fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        // security: unknown origin — don't set CORS headers. Don't throw an
        // Error here because that would trigger the 500 handler for form POSTs
        // that come through the Vercel proxy with Origin set.
        cb(null, false);
      }
    },
    credentials: true,
  });
}
