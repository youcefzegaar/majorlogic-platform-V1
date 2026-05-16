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
  getAffiliateSettings: () => apiClient.get('/affiliate-settings'),
  saveAffiliateSettings: (data) => apiClient.post('/affiliate-settings', data),
  getLogicConfig: (domainId) => apiClient.get(`/logic-config/${domainId}`),
  saveLogicConfig: (domainId, data) => apiClient.post(`/logic-config/${domainId}`, data),
};
