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
import { Request as ExpressRequest } from 'express';
import { AuthToken, KeycloakUserInfo, AuthContext } from '@openmaas/types';
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
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        expires_in: { type: 'number' },
        token_type: { type: 'string' }
      }
    }
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
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        expires_in: { type: 'number' },
        token_type: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Request() req: ExpressRequest & { user: AuthContext }, @Body() loginDto: LoginDto): Promise<AuthToken> {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    schema: {
      type: 'object',
      properties: {
        sub: { type: 'string' },
        email: { type: 'string' },
        given_name: { type: 'string' },
        family_name: { type: 'string' },
        preferred_username: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: ExpressRequest & { user: AuthContext }): Promise<KeycloakUserInfo> {
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
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
        expires_in: { type: 'number' },
        token_type: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async refreshToken(@Request() req: ExpressRequest & { user: AuthContext }): Promise<AuthToken> {
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
    @Request() req: ExpressRequest & { user: AuthContext },
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
  async deleteAccount(@Request() req: ExpressRequest & { user: AuthContext }): Promise<void> {
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
