import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AuthContext, MfaSetupResponse } from '@openmaas/types';
import { MfaService } from '../services/mfa.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { EnableMfaDto, VerifyMfaDto } from '../dto/mfa.dto';

@ApiTags('MFA')
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
  ) {}

  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup MFA for a user' })
  @ApiResponse({
    status: 201,
    description: 'MFA setup initiated. QR code and backup codes returned.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setupMfa(
    @Request() req: ExpressRequest & { user: AuthContext },
  ): Promise<MfaSetupResponse> {
    const userId = req.user.userId;
    const email = req.user.email;

    return this.mfaService.setupMfa(userId, email);
  }

  @Post('enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Enable MFA after verifying token' })
  @ApiResponse({
    status: 204,
    description: 'MFA successfully enabled',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid token' })
  async enableMfa(
    @Request() req: ExpressRequest & { user: AuthContext },
    @Body() enableMfaDto: EnableMfaDto,
  ): Promise<void> {
    const userId = req.user.userId;
    await this.mfaService.enableMfa(userId, enableMfaDto);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify MFA token' })
  @ApiResponse({
    status: 200,
    description: 'MFA token is valid',
  })
  @ApiResponse({ status: 401, description: 'Invalid MFA token' })
  async verifyMfa(
    @Request() req: ExpressRequest & { user: AuthContext },
    @Body() verifyMfaDto: VerifyMfaDto,
  ): Promise<{ valid: boolean }> {
    const userId = req.user.userId;
    const isValid = await this.mfaService.verifyMfa(userId, verifyMfaDto.token);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA token');
    }
    
    return { valid: true };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if MFA is enabled for the user' })
  @ApiResponse({
    status: 200,
    description: 'MFA status',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
      },
    },
  })
  async getMfaStatus(
    @Request() req: ExpressRequest & { user: AuthContext },
  ): Promise<{ enabled: boolean }> {
    const userId = req.user.userId;
    const enabled = await this.mfaService.isMfaEnabled(userId);
    return { enabled };
  }

  @Delete('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable MFA for the user' })
  @ApiResponse({
    status: 204,
    description: 'MFA successfully disabled',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async disableMfa(
    @Request() req: ExpressRequest & { user: AuthContext },
  ): Promise<void> {
    const userId = req.user.userId;
    await this.mfaService.disableMfa(userId);
  }

  @Post('backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({
    status: 200,
    description: 'New backup codes generated',
    schema: {
      type: 'object',
      properties: {
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async regenerateBackupCodes(
    @Request() req: ExpressRequest & { user: AuthContext },
  ): Promise<{ backupCodes: string[] }> {
    const userId = req.user.userId;
    const backupCodes = await this.mfaService.regenerateBackupCodes(userId);
    return { backupCodes };
  }
}
