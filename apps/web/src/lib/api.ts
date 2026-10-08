import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  auth: {
    login: '/api/v1/auth/login',
    register: '/api/v1/auth/register',
    refresh: '/api/v1/auth/refresh',
    profile: '/api/v1/auth/profile',
  },
  users: {
    profile: '/api/v1/users/profile',
    preferences: '/api/v1/users/preferences',
    tripHistory: '/api/v1/users/trip-history',
  },
  routes: {
    search: '/api/v1/routes/search',
    plan: '/api/v1/routes/plan',
  },
  transit: {
    agencies: '/api/v1/transit/agencies',
    routes: '/api/v1/transit/routes',
    stops: '/api/v1/transit/stops',
    feeds: '/api/v1/transit/feeds',
  },
  bookings: {
    list: '/api/v1/bookings',
    create: '/api/v1/bookings',
    details: (id: string) => `/api/v1/bookings/${id}`,
    cancel: (id: string) => `/api/v1/bookings/${id}/cancel`,
  },
  payments: {
    methods: '/api/v1/payments/methods',
    process: '/api/v1/payments/process',
    history: '/api/v1/payments/history',
  },
} as const;