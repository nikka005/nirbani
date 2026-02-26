import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth APIs
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
};

// Farmer APIs
export const farmerAPI = {
    create: (data) => api.post('/farmers', data),
    getAll: (params) => api.get('/farmers', { params }),
    getById: (id) => api.get(`/farmers/${id}`),
    update: (id, data) => api.put(`/farmers/${id}`, data),
    delete: (id) => api.delete(`/farmers/${id}`),
    getLedger: (id, params) => api.get(`/farmers/${id}/ledger`, { params }),
};

// Milk Collection APIs
export const collectionAPI = {
    create: (data) => api.post('/collections', data),
    getAll: (params) => api.get('/collections', { params }),
    getToday: (params) => api.get('/collections/today', { params }),
    delete: (id) => api.delete(`/collections/${id}`),
};

// Rate Chart APIs
export const rateChartAPI = {
    create: (data) => api.post('/rate-charts', data),
    getAll: () => api.get('/rate-charts'),
    getDefault: () => api.get('/rate-charts/default'),
    update: (id, data) => api.put(`/rate-charts/${id}`, data),
    delete: (id) => api.delete(`/rate-charts/${id}`),
    calculateRate: (fat, snf) => api.post(`/rate-charts/calculate-rate?fat=${fat}${snf ? `&snf=${snf}` : ''}`),
};

// Payment APIs
export const paymentAPI = {
    create: (data) => api.post('/payments', data),
    getAll: (params) => api.get('/payments', { params }),
    delete: (id) => api.delete(`/payments/${id}`),
};

// Dashboard APIs
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getWeeklyStats: () => api.get('/dashboard/weekly-stats'),
};

// Report APIs
export const reportAPI = {
    getDaily: (date) => api.get('/reports/daily', { params: { date } }),
    getFarmerReport: (farmerId, params) => api.get(`/reports/farmer/${farmerId}`, { params }),
};

// Dairy Plant APIs
export const dairyPlantAPI = {
    create: (data) => api.post('/dairy-plants', data),
    getAll: () => api.get('/dairy-plants'),
    getById: (id) => api.get(`/dairy-plants/${id}`),
    update: (id, data) => api.put(`/dairy-plants/${id}`, data),
    getLedger: (id, params) => api.get(`/dairy-plants/${id}/ledger`, { params }),
    getStatement: (id, params) => api.get(`/dairy-plants/${id}/statement`, { params }),
};

// Dispatch APIs
export const dispatchAPI = {
    create: (data) => api.post('/dispatches', data),
    getAll: (params) => api.get('/dispatches', { params }),
    getById: (id) => api.get(`/dispatches/${id}`),
    delete: (id) => api.delete(`/dispatches/${id}`),
    matchSlip: (id, data) => api.put(`/dispatches/${id}/slip-match`, data),
    getBill: (id) => api.get(`/dispatches/${id}/bill`),
};

// Dairy Payment APIs
export const dairyPaymentAPI = {
    create: (data) => api.post('/dairy-payments', data),
    getAll: (params) => api.get('/dairy-payments', { params }),
};

// Dairy Reports APIs
export const dairyReportAPI = {
    profitReport: (params) => api.get('/dairy/profit-report', { params }),
    fatAnalysis: (params) => api.get('/dairy/fat-analysis', { params }),
};

export default api;
