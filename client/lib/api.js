import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('smarterp_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('smarterp_token');
      localStorage.removeItem('smarterp_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

// ── Typed API helpers
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  profile: () => api.get('/auth/profile'),
};

export const companyAPI = {
  list: () => api.get('/companies'),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
  getById: (id) => api.get(`/companies/${id}`),
};

export const ledgerAPI = (companyId) => ({
  list: (type) => api.get(`/${companyId}/ledgers`, { params: { type } }),
  create: (data) => api.post(`/${companyId}/ledgers`, data),
  update: (id, data) => api.put(`/${companyId}/ledgers/${id}`, data),
  delete: (id) => api.delete(`/${companyId}/ledgers/${id}`),
  getById: (id) => api.get(`/${companyId}/ledgers/${id}`),
  statement: (id) => api.get(`/${companyId}/ledgers/${id}/statement`),
  exportExcel: (type) => api.get(`/${companyId}/ledgers/export`, { params: { type }, responseType: 'blob' }),
});

export const stockAPI = (companyId) => ({
  listItems: () => api.get(`/${companyId}/stock/items`),
  createItem: (data) => api.post(`/${companyId}/stock/items`, data),
  updateItem: (id, data) => api.put(`/${companyId}/stock/items/${id}`, data),
  deleteItem: (id) => api.delete(`/${companyId}/stock/items/${id}`),
  getItem: (id) => api.get(`/${companyId}/stock/items/${id}`),
  listUnits: () => api.get(`/${companyId}/stock/units`),
  createUnit: (data) => api.post(`/${companyId}/stock/units`, data),
  exportExcel: () => api.get(`/${companyId}/stock/items/export`, { responseType: 'blob' }),
});

export const voucherAPI = (companyId) => ({
  list: (type) => api.get(`/${companyId}/vouchers`, { params: { type } }),
  create: (data) => api.post(`/${companyId}/vouchers`, data),
  getById: (id) => api.get(`/${companyId}/vouchers/${id}`),
  update: (id, data) => api.put(`/${companyId}/vouchers/${id}`, data),
  cancel: (id) => api.patch(`/${companyId}/vouchers/${id}/cancel`),
  downloadPDF: (id) => api.get(`/${companyId}/vouchers/${id}/pdf`, { responseType: 'blob' }),
  exportExcel: (type) => api.get(`/${companyId}/vouchers/export`, { params: { type }, responseType: 'blob' }),
});

export const inventoryAPI = (companyId) => ({
  dashboard: () => api.get(`/${companyId}/inventory/dashboard`),
  logs: (params) => api.get(`/${companyId}/inventory/logs`, { params }),
  adjust: (data) => api.post(`/${companyId}/inventory/adjust`, data),
});

export const customerAPI = (companyId) => ({
  list: () => api.get(`/${companyId}/customers`),
  statement: (id) => api.get(`/${companyId}/customers/${id}/statement`),
});

export const supplierAPI = (companyId) => ({
  list: () => api.get(`/${companyId}/suppliers`),
  statement: (id) => api.get(`/${companyId}/suppliers/${id}/statement`),
});

export const reportAPI = (companyId) => ({
  trialBalance: () => api.get(`/${companyId}/reports/trial-balance`),
  stockSummary: () => api.get(`/${companyId}/reports/stock-summary`),
  sales: (params) => api.get(`/${companyId}/reports/sales`, { params }),
  purchases: (params) => api.get(`/${companyId}/reports/purchases`, { params }),
});
