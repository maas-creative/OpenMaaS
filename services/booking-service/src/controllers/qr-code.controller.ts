import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { QrCodeService } from '../services/qr-code.service';
import { AuthRequest } from '../interfaces/auth-request.interface';
import { IsString, IsNotEmpty } from 'class-validator';

class GenerateQrCodeDto {
  @IsString()
  @IsNotEmpty()
  bookingId!: string;
}

class ValidateQrCodeDto {
  @IsString()
  @IsNotEmpty()
  qrData!: string;
}

@ApiTags('qr-codes')
@Controller('qr-codes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a secure QR code for a booking' })
  @ApiResponse({
    status: 201,
    description: 'QR code generated successfully',
    schema: {
      type: 'object',
      properties: {
        qrData: { type: 'string', description: 'Encrypted QR code data' },
        expiresAt: { type: 'string', format: 'date-time' },
        validFor: { type: 'number', description: 'Validity in seconds' },
      },
    },
  })
  async generateQrCode(
    @Body() dto: GenerateQrCodeDto,
    @Req() req: AuthRequest,
  ) {
    const qrCode = await this.qrCodeService.generateQrCode(
      dto.bookingId,
      req.user.userId,
    );

    return {
      qrData: qrCode.data,
      expiresAt: qrCode.expiresAt,
      validFor: qrCode.validFor,
    };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a QR code' })
  @ApiResponse({
    status: 200,
    description: 'QR code validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        booking: { type: 'object' },
        message: { type: 'string' },
      },
    },
  })
  async validateQrCode(@Body() dto: ValidateQrCodeDto) {
    try {
      const result = await this.qrCodeService.validateQrCode(dto.qrData);
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        return {
          valid: false,
          booking: null,
          message: error.message,
        };
      }
      throw error;
    }
  }

  @Get('booking/:bookingId/current')
  @ApiOperation({ summary: 'Get current QR code for a booking' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'Current QR code data',
    schema: {
      type: 'object',
      properties: {
        qrData: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
        validFor: { type: 'number' },
      },
    },
  })
  async getCurrentQrCode(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthRequest,
  ) {
    const qrCode = await this.qrCodeService.getCurrentQrCode(
      bookingId,
      req.user.userId,
    );

    if (!qrCode) {
      throw new NotFoundException('No active QR code found for this booking');
    }

    return {
      qrData: qrCode.data,
      expiresAt: qrCode.expiresAt,
      validFor: qrCode.validFor,
    };
  }

  @Post('booking/:bookingId/invalidate')
  @ApiOperation({ summary: 'Invalidate all QR codes for a booking' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'QR codes invalidated successfully',
  })
  async invalidateQrCodes(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthRequest,
  ) {
    await this.qrCodeService.invalidateQrCodes(bookingId, req.user.userId);
    return { message: 'QR codes invalidated successfully' };
  }

  @Get('booking/:bookingId/history')
  @ApiOperation({ summary: 'Get QR code usage history for a booking' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  @ApiResponse({
    status: 200,
    description: 'QR code usage history',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          action: { type: 'string', enum: ['generated', 'validated', 'invalidated', 'expired'] },
          timestamp: { type: 'string', format: 'date-time' },
          metadata: { type: 'object' },
        },
      },
    },
  })
  async getQrCodeHistory(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthRequest,
  ) {
    const history = await this.qrCodeService.getQrCodeHistory(
      bookingId,
      req.user.userId,
    );
    return history;
  }
}