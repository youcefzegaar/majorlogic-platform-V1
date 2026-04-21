import * as laptopDomain from "./controllers/laptop-student-us.js";

const registry = new Map();

export function registerDomain(domainId, controller) {
  registry.set(domainId, controller);
}

export function getDomainController(domainId) {
  const controller = registry.get(domainId);
  if (!controller) {
    throw new Error(`Domain not found: ${domainId}`);
  }
  return controller;
}

// Bootstrap default configured domains
registerDomain(laptopDomain.DOMAIN_ID, laptopDomain);
