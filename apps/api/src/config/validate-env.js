/**
 * Environment Variable Validator
 * Ensures all critical secrets are present before the server starts.
 */

export function validateEnv() {
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "COOKIE_SECRET",
    "ADMIN_PASSWORD_HASH",
    "ADMIN_EXPORT_SECRET",
    "ADMIN_USER"
  ];

  const missing = required.filter(k => !process.env[k]);

  if (missing.length > 0) {
    console.error("\x1b[31m[FATAL] Missing environment variables:\x1b[0m\n", missing.join("\n"));
    console.error("\x1b[33mPlease check your .env file or environment configuration.\x1b[0m");
    process.exit(1);
  }

  // Length checks for secrets
  if (process.env.JWT_SECRET.length < 32) {
    console.error("[FATAL] JWT_SECRET is too short (min 32 chars).");
    process.exit(1);
  }
  if (process.env.COOKIE_SECRET.length < 32) {
    console.error("[FATAL] COOKIE_SECRET is too short (min 32 chars).");
    process.exit(1);
  }
  
  console.log("\x1b[32m[CONFIG] Environment variables validated.\x1b[0m");
}
