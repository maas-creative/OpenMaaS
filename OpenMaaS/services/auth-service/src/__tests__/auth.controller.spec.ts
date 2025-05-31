import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from '../dto/auth.dto';
import { AuthToken } from '@openmaas/types';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthToken: AuthToken = {
    accessToken: 'mock-jwt-token',
    tokenType: 'Bearer',
    expiresIn: 604800,
  };

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
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            getUserInfo: jest.fn(),
            refreshToken: jest.fn(),
            changePassword: jest.fn(),
            deleteAccount: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      authService.register.mockResolvedValue(mockAuthToken);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthToken);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      authService.login.mockResolvedValue(mockAuthToken);

      const result = await controller.login({}, loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthToken);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const req = { user: { sub: 'user-123' } };

      authService.getUserInfo.mockResolvedValue(mockUserInfo);

      const result = await controller.getProfile(req);

      expect(authService.getUserInfo).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUserInfo);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      const req = { user: { sub: 'user-123' } };

      authService.refreshToken.mockResolvedValue(mockAuthToken);

      const result = await controller.refreshToken(req);

      expect(authService.refreshToken).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockAuthToken);
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const req = { user: { sub: 'user-123' } };
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      };

      authService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(req, changePasswordDto);

      expect(authService.changePassword).toHaveBeenCalledWith('user-123', changePasswordDto);
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account', async () => {
      const req = { user: { sub: 'user-123' } };

      authService.deleteAccount.mockResolvedValue(undefined);

      await controller.deleteAccount(req);

      expect(authService.deleteAccount).toHaveBeenCalledWith('user-123');
    });
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = controller.health();

      expect(result).toMatchObject({
        status: 'healthy',
        service: 'auth-service',
      });
      expect(result.timestamp).toBeDefined();
    });
  });
});