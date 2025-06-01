import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AuthToken,
  LoginRequest,
  RegisterRequest,
  JwtPayload,
  KeycloakUserInfo,
  ChangePasswordRequest,
} from '@openmaas/types';
import { KeycloakService } from './keycloak.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly keycloakService: KeycloakService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerData: RegisterRequest): Promise<AuthToken> {
    try {
      // Create user in Keycloak
      const { id } = await this.keycloakService.createUser(registerData);

      // Get user info
      const userInfo = await this.keycloakService.getUserById(id);
      if (!userInfo) {
        throw new Error('Failed to retrieve created user');
      }

      // Generate tokens
      return this.generateTokens(userInfo);
    } catch (error) {
      if (error instanceof Error && 'response' in error && (error as any).response?.status === 409) {
        throw new ConflictException('User with this email already exists');
      }
      throw error;
    }
  }

  async login(loginData: LoginRequest): Promise<AuthToken> {
    const { email, password } = loginData;

    // Validate credentials with Keycloak
    const userInfo = await this.keycloakService.validateUser(email, password);
    if (!userInfo) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    return this.generateTokens(userInfo);
  }

  async validateUser(email: string, password: string): Promise<KeycloakUserInfo | null> {
    return this.keycloakService.validateUser(email, password);
  }

  async refreshToken(userId: string): Promise<AuthToken> {
    const userInfo = await this.keycloakService.getUserById(userId);
    if (!userInfo) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(userInfo);
  }

  async changePassword(userId: string, changePasswordData: ChangePasswordRequest): Promise<void> {
    const { currentPassword, newPassword } = changePasswordData;

    // Get user info
    const userInfo = await this.keycloakService.getUserById(userId);
    if (!userInfo || !userInfo.email) {
      throw new UnauthorizedException('User not found');
    }

    // Validate current password
    const isValid = await this.keycloakService.validateUser(userInfo.email, currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Update password
    await this.keycloakService.updateUserPassword(userId, newPassword);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.keycloakService.deleteUser(userId);
  }

  async getUserInfo(userId: string): Promise<KeycloakUserInfo> {
    const userInfo = await this.keycloakService.getUserById(userId);
    if (!userInfo) {
      throw new UnauthorizedException('User not found');
    }

    return userInfo;
  }

  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch (error) {
      return null;
    }
  }

  private async generateTokens(userInfo: KeycloakUserInfo): Promise<AuthToken> {
    // Get user roles
    const roles = await this.keycloakService.getUserRoles(userInfo.sub);

    const payload: JwtPayload = {
      sub: userInfo.sub,
      email: userInfo.email || '',
      roles,
      iat: Math.floor(Date.now() / 1000),
      exp: 0, // Will be set by JWT service
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '7d';

    // Convert expiresIn to seconds
    let expiresInSeconds = 604800; // 7 days default
    if (expiresIn.endsWith('d')) {
      expiresInSeconds = parseInt(expiresIn) * 86400;
    } else if (expiresIn.endsWith('h')) {
      expiresInSeconds = parseInt(expiresIn) * 3600;
    } else if (expiresIn.endsWith('m')) {
      expiresInSeconds = parseInt(expiresIn) * 60;
    }

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
    };
  }
}
