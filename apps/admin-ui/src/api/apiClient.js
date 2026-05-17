import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/admin', // All admin routes start with /admin
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
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
  getAffiliateSettings: () => apiClient.get('/affiliate-settings'),
  saveAffiliateSettings: (data) => apiClient.post('/affiliate-settings', data),
  getLogicConfig: (domainId) => apiClient.get(`/logic-config/${domainId}`),
  saveLogicConfig: (domainId, data) => apiClient.post(`/logic-config/${domainId}`, data),
};
