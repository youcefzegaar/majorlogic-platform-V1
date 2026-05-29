const API_URL = import.meta.env.VITE_API_URL || 'https://majorlogicapi-production.up.railway.app';

/**
 * Route a purchase through the /go/ gateway (affiliate-logged, SSRF-safe).
 * seller: 'amazon_renewed' | 'ebay' | 'amazon' | '' (primary offer)
 */
export function buildGoUrl(entityId, { seller = '', domain = 'laptop-student-us' } = {}) {
  const base = `${API_URL}/go/${domain}/${encodeURIComponent(entityId)}`;
  return seller ? `${base}?seller=${encodeURIComponent(seller)}` : base;
}

/**
 * Fire-and-forget telemetry on buy/link clicks.
 * Never blocks navigation — errors are silently swallowed.
 */
export function trackClick({ entityId, decisionRunId = null, clickType = 'buy_now_clicked', domain = 'laptop-student-us' }) {
  if (!entityId) return;
  fetch(`${API_URL}/api/v1/${domain}/telemetry/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ entityId, decisionRunId, clickType }),
  }).catch(() => {});
}

/**
 * Open a buy link via the /go/ gateway and log the click.
 */
export function openBuyLink({ entityId, seller = '', domain = 'laptop-student-us', decisionRunId = null, clickType = 'buy_now_clicked' }) {
  trackClick({ entityId, decisionRunId, clickType, domain });
  const url = buildGoUrl(entityId, { seller, domain });
  window.open(url, '_blank', 'noopener,noreferrer');
}
