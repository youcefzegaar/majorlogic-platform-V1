// Protects /admin/* except: login page, logout, and static SPA assets
const ADMIN_PUBLIC = ["/admin/login", "/admin/logout"];
const STATIC_EXT   = /\.(js|css|svg|ico|png|woff2?|map)$/;

export function registerAdminAuth(fastify) {
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
      return reply.redirect("/admin/login", 302);
    }
  });
}
