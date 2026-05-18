const registry = new Map();

export function registerDomain(domainId, controller) {
  registry.set(domainId, controller);
}

export function getDomainController(domainId) {
  const controller = registry.get(domainId);
  if (!controller) throw new Error(`Domain not found: ${domainId}`);
  return controller;
}

export function getValidDomains() {
  return new Set(registry.keys());
}

// Bootstrap domains from ENABLED_DOMAINS env var (comma-separated)
// Defaults to the original laptop-student-us domain
const ENABLED_DOMAINS = (process.env.ENABLED_DOMAINS ?? "laptop-student-us")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

for (const domainId of ENABLED_DOMAINS) {
  try {
    const mod = await import(`./controllers/${domainId}.js`);
    registerDomain(mod.DOMAIN_ID ?? domainId, mod);
    console.log(`[registry] Loaded domain: ${domainId}`);
  } catch (e) {
    console.error(`[registry] Failed to load domain "${domainId}": ${e.message}`);
    process.exit(1);
  }
}
