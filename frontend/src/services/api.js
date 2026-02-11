import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const systemAPI = {
  getHealth: () => api.get('/api/system/health')
};

export const messagesAPI = {
  submit: (message) => api.post('/api/messages', message)
};

export const dlqAPI = {
  list: (params) => api.get('/api/dlq', { params }),
  getStats: () => api.get('/api/dlq/stats'),
  getById: (id) => api.get(`/api/dlq/${id}`),
  replay: (id) => api.post(`/api/dlq/${id}/replay`),
  replayBatch: (data) => api.post('/api/dlq/replay-batch', data)
};

export default api;
