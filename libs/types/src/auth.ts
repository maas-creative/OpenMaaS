export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  iat: number;
  exp: number;
  iss?: string;
  aud?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthContext {
  userId: string;
  email: string;
  roles: string[];
  sessionId?: string;
}

export interface KeycloakUserInfo {
  sub: string;
  email_verified: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface VerifyMfaRequest {
  token: string;
}

export interface EnableMfaRequest {
  token: string;
}

export interface LoginWithMfaRequest {
  email: string;
  password: string;
  mfaToken?: string;
}
