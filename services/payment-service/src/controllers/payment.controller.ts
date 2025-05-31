import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PaymentService } from '../services/payment.service';
import { PaymentMethodService } from '../services/payment-method.service';
import { 
  CreatePaymentDto, 
  ProcessPaymentDto, 
  CreateRefundDto,
  CreatePaymentMethodDto,
  PaymentResponseDto,
  PaymentSessionResponseDto,
  PaymentMethodResponseDto,
  PaymentHistoryDto,
  RefundResponseDto
} from '../dto/payment.dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentMethodService: PaymentMethodService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a payment session' })
  @ApiResponse({
    status: 201,
    description: 'Payment session created successfully',
    type: PaymentSessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid payment request' })
  async createPayment(
    @Request() req: any,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentSessionResponseDto> {
    return this.paymentService.createPayment(req.user.userId, dto);
  }

  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment processed successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid payment data' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async processPayment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ProcessPaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.processPayment(req.user.userId, id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get payment history' })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
  })
  async getPaymentHistory(
    @Request() req: any,
    @Query() query: PaymentHistoryDto,
  ): Promise<any> {
    return this.paymentService.getPaymentHistory(req.user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment details retrieved successfully',
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.getPayment(req.user.userId, id);
  }

  @Post('refunds')
  @ApiOperation({ summary: 'Create a refund' })
  @ApiResponse({
    status: 201,
    description: 'Refund created successfully',
    type: RefundResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid refund request' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async createRefund(
    @Request() req: any,
    @Body() dto: CreateRefundDto,
  ): Promise<any> {
    return this.paymentService.createRefund(req.user.userId, dto);
  }

  // Payment Methods endpoints
  @Get('methods')
  @ApiOperation({ summary: 'Get user payment methods' })
  @ApiResponse({
    status: 200,
    description: 'Payment methods retrieved successfully',
    type: [PaymentMethodResponseDto],
  })
  async getPaymentMethods(@Request() req: any): Promise<PaymentMethodResponseDto[]> {
    return this.paymentMethodService.getPaymentMethods(req.user.userId);
  }

  @Post('methods')
  @ApiOperation({ summary: 'Add a payment method' })
  @ApiResponse({
    status: 201,
    description: 'Payment method added successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid payment method' })
  async addPaymentMethod(
    @Request() req: any,
    @Body() dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    return this.paymentMethodService.addPaymentMethod(req.user.userId, dto);
  }

  @Get('methods/:id')
  @ApiOperation({ summary: 'Get payment method details' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment method details retrieved successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async getPaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PaymentMethodResponseDto> {
    return this.paymentMethodService.getPaymentMethod(req.user.userId, id);
  }

  @Put('methods/:id/default')
  @ApiOperation({ summary: 'Set default payment method' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({
    status: 200,
    description: 'Default payment method set successfully',
    type: PaymentMethodResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async setDefaultPaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PaymentMethodResponseDto> {
    return this.paymentMethodService.setDefaultPaymentMethod(req.user.userId, id);
  }

  @Delete('methods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a payment method' })
  @ApiParam({ name: 'id', description: 'Payment method ID' })
  @ApiResponse({ status: 204, description: 'Payment method removed successfully' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  @ApiResponse({ status: 400, description: 'Cannot remove payment method' })
  async removePaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    return this.paymentMethodService.removePaymentMethod(req.user.userId, id);
  }

  @Post('methods/sync')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sync payment methods with Stripe' })
  @ApiResponse({ status: 204, description: 'Payment methods synced successfully' })
  async syncPaymentMethods(@Request() req: any): Promise<void> {
    return this.paymentMethodService.syncStripePaymentMethods(req.user.userId);
  }
}