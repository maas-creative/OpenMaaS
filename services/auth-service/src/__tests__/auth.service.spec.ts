import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { KeycloakService } from '../services/keycloak.service';
import { RegisterRequest, LoginRequest, ChangePasswordRequest } from '@openmaas/types';

describe('AuthService', () => {
  let service: AuthService;
  let keycloakService: jest.Mocked<KeycloakService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUserInfo = {
    sub: 'user-123',
    email: 'test@example.com',
    email_verified: true,
    preferred_username: 'testuser',
    given_name: 'Test',
    family_name: 'User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: KeycloakService,
          useValue: {
            createUser: jest.fn(),
            validateUser: jest.fn(),
            getUserById: jest.fn(),
            getUserRoles: jest.fn(),
            updateUserPassword: jest.fn(),
            deleteUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    keycloakService = module.get(KeycloakService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    configService.get.mockReturnValue('7d');
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData: RegisterRequest = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      keycloakService.createUser.mockResolvedValue({ id: 'user-123' });
      keycloakService.getUserById.mockResolvedValue(mockUserInfo);
      keycloakService.getUserRoles.mockResolvedValue(['user']);
      jwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.register(registerData);

      expect(keycloakService.createUser).toHaveBeenCalledWith(registerData);
      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        tokenType: 'Bearer',
        expiresIn: 604800,
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerData: RegisterRequest = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
      };

      keycloakService.createUser.mockRejectedValue({
        response: { status: 409 },
      });

      await expect(service.register(registerData)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      keycloakService.validateUser.mockResolvedValue(mockUserInfo);
      keycloakService.getUserRoles.mockResolvedValue(['user']);
      jwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.login(loginData);

      expect(keycloakService.validateUser).toHaveBeenCalledWith(
        loginData.email,
        loginData.password,
      );
      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        tokenType: 'Bearer',
        expiresIn: 604800,
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      keycloakService.validateUser.mockResolvedValue(null);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user-123';
      const changePasswordData: ChangePasswordRequest = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      };

      keycloakService.getUserById.mockResolvedValue(mockUserInfo);
      keycloakService.validateUser.mockResolvedValue(mockUserInfo);
      keycloakService.updateUserPassword.mockResolvedValue(undefined);

      await service.changePassword(userId, changePasswordData);

      expect(keycloakService.updateUserPassword).toHaveBeenCalledWith(
        userId,
        changePasswordData.newPassword,
      );
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const userId = 'user-123';
      const changePasswordData: ChangePasswordRequest = {
        currentPassword: 'WrongPass123!',
        newPassword: 'NewPass123!',
      };

      keycloakService.getUserById.mockResolvedValue(mockUserInfo);
      keycloakService.validateUser.mockResolvedValue(null);

      await expect(service.changePassword(userId, changePasswordData)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const token = 'valid-jwt-token';
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 604800,
      };

      jwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.validateToken(token);

      expect(result).toEqual(payload);
    });

    it('should return null for invalid token', async () => {
      const token = 'invalid-jwt-token';

      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const result = await service.validateToken(token);

      expect(result).toBeNull();
    });
  });
});