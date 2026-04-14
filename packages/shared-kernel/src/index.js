export const CARD_TYPES = ["hero", "smart_budget", "future_proof"];

export function normalizeId(...parts) {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}
