// @ts-check

/** @returns {void} */
export function validateEnv() {
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "COOKIE_SECRET",
    "ADMIN_PASSWORD_HASH",
    "ADMIN_EXPORT_SECRET",
    "ADMIN_USER",
    "ENCRYPTION_KEY"
  ];

  const isProd = process.env.NODE_ENV === "production";

  // In production, ALLOWED_ORIGINS must be set explicitly — no fallback to localhost
  if (isProd) {
    required.push("ALLOWED_ORIGINS", "FRONTEND_URL");
  }

  const missing = required.filter(k => !process.env[k]);

  if (missing.length > 0) {
    console.error("\x1b[31m[FATAL] Missing environment variables:\x1b[0m\n", missing.join("\n"));
    console.error("\x1b[33mPlease check your .env file or environment configuration.\x1b[0m");
    process.exit(1);
  }

  // Length checks for secrets
  if ((process.env.JWT_SECRET ?? "").length < 32) {
    console.error("[FATAL] JWT_SECRET is too short (min 32 chars).");
    process.exit(1);
  }
  if ((process.env.COOKIE_SECRET ?? "").length < 32) {
    console.error("[FATAL] COOKIE_SECRET is too short (min 32 chars).");
    process.exit(1);
  }
  if ((process.env.ADMIN_EXPORT_SECRET ?? "").length < 32) {
    console.error("[FATAL] ADMIN_EXPORT_SECRET is too short (min 32 chars).");
    process.exit(1);
  }
  if ((process.env.ENCRYPTION_KEY ?? "").length < 32) {
    console.error("[FATAL] ENCRYPTION_KEY is too short (min 32 chars).");
    process.exit(1);
  }

  // In production, verify ALLOWED_ORIGINS contains at least one https:// entry
  if (isProd) {
    const origins = (process.env.ALLOWED_ORIGINS ?? "").split(",").map(o => o.trim()).filter(Boolean);
    if (origins.length === 0) {
      console.error("[FATAL] ALLOWED_ORIGINS is set but contains no valid origins.");
      process.exit(1);
    }
    const hasHttps = origins.every(o => o.startsWith("https://"));
    if (!hasHttps) {
      console.error("[FATAL] All ALLOWED_ORIGINS must use https:// in production.");
      process.exit(1);
    }
  }

  if (isProd && !process.env.PUBLIC_BASE_URL) {
    console.warn("\x1b[33m[CONFIG] WARNING: PUBLIC_BASE_URL is not set. Defaulting to https://majorlogic.tech\x1b[0m");
  }

  console.log("\x1b[32m[CONFIG] Environment variables validated.\x1b[0m");
}

/** @returns {string} */
export function getPublicBaseUrl() {
  return (process.env.PUBLIC_BASE_URL ?? "https://majorlogic.tech").replace(/\/$/, "");
}
