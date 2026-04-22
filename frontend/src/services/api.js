import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const systemAPI = {
  getHealth: () => api.get('/api/system/health'),
  getCircuitBreaker: () => api.get('/api/system/circuit-breaker')
};

export const messagesAPI = {
  submit: (message) => api.post('/api/messages', message),
  getStats: () => api.get('/api/messages/stats')
};

export const dlqAPI = {
  list: (params) => api.get('/api/dlq', { params }),
  getStats: () => api.get('/api/dlq/stats'),
  getById: (id) => api.get(`/api/dlq/${id}`),
  resolve: (id, data = {}) => api.post(`/api/dlq/${id}/resolve`, data),
  replay: (id) => api.post(`/api/dlq/${id}/replay`),
  replayBatch: (data) => api.post('/api/dlq/replay-batch', data)
};

export default api;
