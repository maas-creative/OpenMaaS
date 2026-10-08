// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Service endpoints through API Gateway
export const SERVICE_ENDPOINTS = {
  auth: `${API_BASE_URL}/api/v1/auth`,
  user: `${API_BASE_URL}/api/v1/users`,
  transit: `${API_BASE_URL}/api/v1/transit`,
  route: `${API_BASE_URL}/api/v1/routes`,
  booking: `${API_BASE_URL}/api/v1/bookings`,
  payment: `${API_BASE_URL}/api/v1/payments`,
};
