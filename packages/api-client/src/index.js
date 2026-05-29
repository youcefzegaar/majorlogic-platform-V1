/**
 * @majorlogic/api-client — shared platform API client
 *
 * Used by both search-ui and admin-ui so every endpoint is defined once.
 * search-ui uses the fetch-based client (no axios dependency).
 * admin-ui wraps this with its axios interceptors for auth/CSRF.
 */

// ── Platform API base URL ─────────────────────────────────────────────────────

export function getPlatformBaseUrl() {
  // Works in both Vite (import.meta.env) and Node (process.env) contexts
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof process !== 'undefined' && process.env?.API_URL) {
    return process.env.API_URL;
  }
  return 'https://majorlogicapi-production.up.railway.app';
}

// ── Decision API ──────────────────────────────────────────────────────────────

/**
 * Run the decision engine for a given domain and profile.
 * Returns the raw API response JSON.
 */
export async function runDecision(profile, { domain = 'laptop-student-us', baseUrl } = {}) {
  const url = `${baseUrl ?? getPlatformBaseUrl()}/api/v1/${domain}/decision/run`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error(`Decision API error: ${response.status}`);
  return response.json();
}

/**
 * Submit feedback for a decision run.
 */
export async function submitFeedback({ decisionRunId, score, comment, tags, domain = 'laptop-student-us', baseUrl } = {}) {
  const url = `${baseUrl ?? getPlatformBaseUrl()}/api/v1/${domain}/feedback`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ decisionRunId, score, comment, tags }),
  }).catch(() => {}); // fire-and-forget
}

/**
 * Track a click event (affiliate or buy button).
 */
export function trackClick({ entityId, decisionRunId = null, clickType = 'buy_now_clicked', domain = 'laptop-student-us', baseUrl } = {}) {
  if (!entityId) return;
  const url = `${baseUrl ?? getPlatformBaseUrl()}/api/v1/${domain}/telemetry/click`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ entityId, decisionRunId, clickType }),
  }).catch(() => {});
}

/**
 * Build the /go/ affiliate gateway URL (SSRF-safe, no direct affiliate URL on client).
 */
export function buildGoUrl(entityId, { seller = '', domain = 'laptop-student-us', baseUrl } = {}) {
  const base = `${baseUrl ?? getPlatformBaseUrl()}/go/${domain}/${encodeURIComponent(entityId)}`;
  return seller ? `${base}?seller=${encodeURIComponent(seller)}` : base;
}

// ── User / Account API ────────────────────────────────────────────────────────

/**
 * Capture a growth lead (email for price alerts, waitlist, etc.)
 */
export async function captureGrowthLead({ email, leadType, trackingData, domain = 'laptop-student-us', baseUrl } = {}) {
  const url = `${baseUrl ?? getPlatformBaseUrl()}/api/v1/${domain}/growth/lead`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, leadType, trackingData }),
  });
  if (!res.ok) throw new Error(`Lead capture failed: ${res.status}`);
  return res.json();
}
