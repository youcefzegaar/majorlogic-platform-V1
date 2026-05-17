// Barrel export — backward-compatible public API for this package.
// All consumers importing { createPostgresClient, PostgresPlatformRepository }
// continue to work without any changes.

export { createPostgresClient } from "./pool.js";
export { PostgresPlatformRepository } from "./PostgresPlatformRepository.js";
