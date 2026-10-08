import { SERVICE_ENDPOINTS } from './config';

interface QrCodeResponse {
  qrData: string;
  expiresAt: string;
  validFor: number;
}

interface QrCodeValidationResponse {
  valid: boolean;
  booking?: any;
  message: string;
}

interface QrCodeHistory {
  id: string;
  action: 'generated' | 'validated' | 'invalidated' | 'expired';
  timestamp: string;
  metadata?: Record<string, any>;
}

export async function generateQrCode(bookingId: string): Promise<QrCodeResponse> {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${SERVICE_ENDPOINTS.booking}/qr-codes/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ bookingId }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate QR code');
  }

  return response.json();
}

export async function validateQrCode(qrData: string): Promise<QrCodeValidationResponse> {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${SERVICE_ENDPOINTS.booking}/qr-codes/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ qrData }),
  });

  if (!response.ok) {
    throw new Error('Failed to validate QR code');
  }

  return response.json();
}

export async function getCurrentQrCode(bookingId: string): Promise<QrCodeResponse | null> {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${SERVICE_ENDPOINTS.booking}/qr-codes/booking/${bookingId}/current`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to get current QR code');
  }

  return response.json();
}

export async function invalidateQrCodes(bookingId: string): Promise<void> {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${SERVICE_ENDPOINTS.booking}/qr-codes/booking/${bookingId}/invalidate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to invalidate QR codes');
  }
}

export async function getQrCodeHistory(bookingId: string): Promise<QrCodeHistory[]> {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`${SERVICE_ENDPOINTS.booking}/qr-codes/booking/${bookingId}/history`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get QR code history');
  }

  return response.json();
}
