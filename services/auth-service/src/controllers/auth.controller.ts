import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import {
  AuthToken,
  KeycloakUserInfo,
} from '@openmaas/types';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto, ChangePasswordDto } from '../dto/auth.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthToken,
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthToken> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthToken,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Request() req: Express.Request, @Body() loginDto: LoginDto): Promise<AuthToken> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    type: KeycloakUserInfo,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: Express.Request): Promise<KeycloakUserInfo> {
    return this.authService.getUserInfo(req.user.sub);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully refreshed',
    type: AuthToken,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshToken(@Request() req: Express.Request): Promise<AuthToken> {
    return this.authService.refreshToken(req.user.sub);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({
    status: 204,
    description: 'Password successfully changed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized or incorrect password' })
  async changePassword(
    @Request() req: Express.Request,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(req.user.sub, changePasswordDto);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({
    status: 204,
    description: 'Account successfully deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAccount(@Request() req: Express.Request): Promise<void> {
    await this.authService.deleteAccount(req.user.sub);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
  })
  health() {
    return {
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    };
  }
}
