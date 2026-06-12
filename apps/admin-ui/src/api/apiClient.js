import axios from 'axios';
// Platform API methods (shared with search-ui) — defined once, used by both apps
export { runDecision, submitFeedback, trackClick, buildGoUrl, captureGrowthLead } from '../../../../packages/api-client/src/index.js';

// security: read the csrf_token cookie set by the server on GET /admin/* requests.
// The cookie is httpOnly:false so JavaScript can read it here and echo it back
// as a header (double-submit cookie CSRF pattern).
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const STATE_CHANGING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

const apiClient = axios.create({
  baseURL: '/admin', // All admin routes start with /admin
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// security: attach X-CSRF-Token header automatically on all state-changing requests.
apiClient.interceptors.request.use((config) => {
  if (STATE_CHANGING_METHODS.has(config.method?.toLowerCase())) {
    const token = getCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

// Interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if token is expired
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export const adminService = {
  getOverview: () => apiClient.get('/dashboard'),
  getDomains: () => apiClient.get('/domains'),
  getDecisionTrace: (id) => apiClient.get(`/decision-trace/${id}`),
  simulate: (data) => apiClient.post('/simulate', data),
  getInterventions: () => apiClient.get('/interventions-data'),
  getGrowthStats: () => apiClient.get('/growth-stats'),
  getLeads: (params) => apiClient.get('/leads', { params }),
  getAuditLog: (params) => apiClient.get('/audit-log', { params }),
  getIntegrations: () => apiClient.get('/integrations'),
  saveIntegration: (slug, data) => apiClient.post(`/integrations/${slug}`, data),
  addIntegration: (data) => apiClient.post('/integrations', data),
  testIntegration: (slug) => apiClient.post(`/integrations/${slug}/test`),
  revokeIntegration: (slug) => apiClient.delete(`/integrations/${slug}/credentials`),
  deleteIntegration: (slug) => apiClient.delete(`/integrations/${slug}`),
  reseedIntegrations: () => apiClient.get('/integrations/reseed'),
  getAffiliateSettings: () => apiClient.get('/affiliate-settings'),
  saveAffiliateSettings: (data) => apiClient.post('/affiliate-settings', data),
  getLogicConfig: (domainId) => apiClient.get(`/logic-config/${domainId}`),
  saveLogicConfig: (domainId, data) => apiClient.post(`/logic-config/${domainId}`, data),
  rebuildCatalog: (domainId) => apiClient.post('/catalog/rebuild', { domainId }),
  getCatalogRebuildStatus: (jobId) => apiClient.get(`/catalog/rebuild/${jobId}`),
  getOwnershipConfig: (domainSlug) => apiClient.get(`/domains/${domainSlug}/ownership-config`).then(r => r.data),
  saveOwnershipConfig: (domainSlug, data) => apiClient.put(`/domains/${domainSlug}/ownership-config`, data).then(r => r.data),
  getOwnershipPresets: () => apiClient.get('/ownership-presets').then(r => r.data),
  getFeedback: (params) => apiClient.get('/feedback', { params }),
  getReport: () => apiClient.get('/report'),
  getSacrificeReport: (sinceDays = 30) => apiClient.get('/sacrifice-report', { params: { sinceDays } }),
  getCacheStats: () => apiClient.get('/cache-stats'),
  getAnalytics: (sinceDays = 30) => apiClient.get('/analytics', { params: { sinceDays } }),
};
