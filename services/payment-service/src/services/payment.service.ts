import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentMethodRepository } from '../repositories/payment-method.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { StripeService } from './stripe.service';
import {
  CreatePaymentDto,
  ProcessPaymentDto,
  CreateRefundDto,
  PaymentResponseDto,
  PaymentSessionResponseDto,
  PaymentHistoryDto,
} from '../dto/payment.dto';
import { PaymentStatus, PaymentProvider, RefundStatus } from '@openmaas/types';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly refundRepository: RefundRepository,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  async createPayment(userId: string, dto: CreatePaymentDto): Promise<PaymentSessionResponseDto> {
    try {
      // Check for idempotency
      if (dto.idempotencyKey) {
        const existingPayment = await this.paymentRepository.findByIdempotencyKey(
          dto.idempotencyKey,
        );
        if (existingPayment) {
          return this.createSessionFromPayment(existingPayment);
        }
      }

      // Validate payment method
      const paymentMethod = await this.paymentMethodRepository.findByUserAndId(
        userId,
        dto.paymentMethodId,
      );
      if (!paymentMethod) {
        throw new BadRequestException('Invalid payment method');
      }

      // Get or create Stripe customer
      let stripeCustomerId = paymentMethod.stripeCustomerId;
      if (!stripeCustomerId) {
        // This should ideally be stored at user level
        const customer = await this.stripeService.createCustomer({
          email: `user_${userId}@openmaas.app`, // In production, get from user service
          metadata: { userId },
        });
        stripeCustomerId = customer.id;

        // Update payment method with customer ID
        await this.paymentMethodRepository.update(paymentMethod.id, {
          stripeCustomerId,
        });
      }

      // Create Stripe payment intent
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: dto.amount,
        currency: dto.currency,
        customerId: stripeCustomerId,
        paymentMethodId: paymentMethod.stripePaymentMethodId,
        description: dto.description,
        metadata: {
          userId,
          bookingId: dto.bookingId,
          paymentMethodId: dto.paymentMethodId,
        },
        returnUrl: dto.returnUrl,
      });

      // Create payment record
      const payment = await this.paymentRepository.create({
        userId,
        bookingId: dto.bookingId,
        amount: dto.amount / 100, // Store in major units
        currency: dto.currency,
        status: PaymentStatus.PENDING,
        paymentMethodId: dto.paymentMethodId,
        provider: PaymentProvider.STRIPE,
        stripePaymentIntentId: paymentIntent.id,
        description: dto.description,
        metadata: dto.metadata,
        idempotencyKey: dto.idempotencyKey,
      });

      this.logger.log(`Created payment ${payment.id} for user ${userId}`);

      return this.createSessionFromPayment(payment, paymentIntent);
    } catch (error) {
      this.logger.error(`Error creating payment for user ${userId}:`, error);
      throw error;
    }
  }

  async processPayment(
    userId: string,
    paymentId: string,
    dto: ProcessPaymentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new BadRequestException('Unauthorized payment access');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment cannot be processed in current status');
    }

    try {
      // Confirm payment with Stripe
      if (!payment.stripePaymentIntentId) {
        throw new BadRequestException('Payment intent ID not found');
      }
      
      const paymentIntent = await this.stripeService.confirmPaymentIntent(
        payment.stripePaymentIntentId,
        dto.paymentMethodId,
      );

      // Update payment status based on Stripe response
      const status = this.mapStripeStatus(paymentIntent.status);

      await this.paymentRepository.updateStatus(payment.id, status, {
        providerTransactionId: paymentIntent.id,
        stripeChargeId: paymentIntent.latest_charge as string || undefined,
        receiptUrl: undefined, // Will be fetched separately if needed
      });

      const updatedPayment = await this.paymentRepository.findById(payment.id);

      this.logger.log(`Processed payment ${payment.id} with status ${status}`);
      return this.toResponseDto(updatedPayment);
    } catch (error) {
      this.logger.error(`Error processing payment ${payment.id}:`, error);

      await this.paymentRepository.updateStatus(payment.id, PaymentStatus.FAILED, {
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new BadRequestException('Payment processing failed');
    }
  }

  async getPayment(userId: string, paymentId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new BadRequestException('Unauthorized payment access');
    }

    return this.toResponseDto(payment);
  }

  async getPaymentHistory(userId: string, query: PaymentHistoryDto): Promise<any> {
    const { payments, total } = await this.paymentRepository.findAll(
      userId,
      query.bookingId,
      query.status,
      query.fromDate ? new Date(query.fromDate) : undefined,
      query.toDate ? new Date(query.toDate) : undefined,
      query.limit || 20,
      query.offset || 0,
    );

    return {
      payments: payments.map((p) => this.toResponseDto(p)),
      total,
      limit: query.limit || 20,
      offset: query.offset || 0,
    };
  }

  async createRefund(userId: string, dto: CreateRefundDto): Promise<any> {
    const payment = await this.paymentRepository.findById(dto.paymentId);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new BadRequestException('Unauthorized payment access');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    // Check refund window
    const refundWindowDays = this.configService.get('payment.refundWindowDays');
    if (!payment.completedAt) {
      throw new BadRequestException('Payment completion date not available');
    }
    const refundDeadline = new Date(payment.completedAt);
    refundDeadline.setDate(refundDeadline.getDate() + refundWindowDays);

    if (new Date() > refundDeadline) {
      throw new BadRequestException('Refund window has expired');
    }

    // Calculate refund amount
    const refundAmount = dto.amount || payment.amount;
    const totalRefunded = await this.refundRepository.getTotalRefundedAmount(payment.id);

    if (totalRefunded + refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    try {
      // Create Stripe refund
      const stripeRefund = await this.stripeService.createRefund({
        paymentIntentId: payment.stripePaymentIntentId || '',
        amount: Math.round(refundAmount * 100), // Convert to minor units
        reason: 'requested_by_customer',
        metadata: {
          userId,
          paymentId: payment.id,
          reason: dto.reason || '',
        },
      });

      // Create refund record
      const refund = await this.refundRepository.create({
        paymentId: payment.id,
        amount: refundAmount,
        currency: payment.currency,
        status: RefundStatus.PROCESSING,
        reason: dto.reason,
        stripeRefundId: stripeRefund.id,
        metadata: { stripeRefund },
      });

      // Update payment refunded amount
      await this.paymentRepository.incrementRefundedAmount(payment.id, refundAmount);

      this.logger.log(`Created refund ${refund.id} for payment ${payment.id}`);

      return {
        id: refund.id,
        paymentId: refund.paymentId,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        createdAt: refund.createdAt,
      };
    } catch (error) {
      this.logger.error(`Error creating refund for payment ${payment.id}:`, error);
      throw new BadRequestException('Refund creation failed');
    }
  }

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    this.logger.log(`Handling Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'refund.updated':
        await this.handleRefundUpdated(event.data.object as Stripe.Refund);
        break;

      default:
        this.logger.debug(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findByStripePaymentIntentId(paymentIntent.id);

    if (!payment) {
      this.logger.warn(`Payment not found for payment intent ${paymentIntent.id}`);
      return;
    }

    await this.paymentRepository.updateStatus(payment.id, PaymentStatus.COMPLETED, {
      providerTransactionId: paymentIntent.id,
      stripeChargeId: paymentIntent.latest_charge as string || undefined,
      receiptUrl: undefined, // Will be fetched separately if needed
    });

    this.logger.log(`Payment ${payment.id} marked as completed`);
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const payment = await this.paymentRepository.findByStripePaymentIntentId(paymentIntent.id);

    if (!payment) {
      this.logger.warn(`Payment not found for payment intent ${paymentIntent.id}`);
      return;
    }

    await this.paymentRepository.updateStatus(payment.id, PaymentStatus.FAILED, {
      failureReason: paymentIntent.last_payment_error?.message,
      failureCode: paymentIntent.last_payment_error?.code,
    });

    this.logger.log(`Payment ${payment.id} marked as failed`);
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    if (!charge.payment_intent) {
      return;
    }

    const payment = await this.paymentRepository.findByStripePaymentIntentId(
      charge.payment_intent as string,
    );

    if (!payment) {
      return;
    }

    const refundedAmount = charge.amount_refunded / 100;

    if (refundedAmount >= payment.amount) {
      await this.paymentRepository.updateStatus(payment.id, PaymentStatus.REFUNDED);
    } else if (refundedAmount > 0) {
      await this.paymentRepository.updateStatus(payment.id, PaymentStatus.PARTIALLY_REFUNDED);
    }
  }

  private async handleRefundUpdated(refund: Stripe.Refund): Promise<void> {
    const refundEntity = await this.refundRepository.findByStripeRefundId(refund.id);

    if (!refundEntity) {
      this.logger.warn(`Refund not found for Stripe refund ${refund.id}`);
      return;
    }

    const status =
      refund.status === 'succeeded'
        ? RefundStatus.COMPLETED
        : refund.status === 'failed'
          ? RefundStatus.FAILED
          : RefundStatus.PROCESSING;

    await this.refundRepository.updateStatus(refundEntity.id, status, {
      failureReason: refund.failure_reason,
    });

    this.logger.log(`Refund ${refundEntity.id} updated to status ${status}`);
  }

  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'succeeded':
        return PaymentStatus.COMPLETED;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'canceled':
        return PaymentStatus.CANCELLED;
      case 'failed':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }

  private createSessionFromPayment(
    payment: any,
    paymentIntent?: Stripe.PaymentIntent,
  ): PaymentSessionResponseDto {
    return {
      id: payment.id,
      clientSecret: paymentIntent?.client_secret || '',
      paymentIntentId: payment.stripePaymentIntentId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      publishableKey: this.configService.get('stripe.publishableKey'),
    };
  }

  private toResponseDto(entity: any): PaymentResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      bookingId: entity.bookingId,
      amount: entity.amount,
      currency: entity.currency,
      status: entity.status,
      paymentMethodId: entity.paymentMethodId,
      provider: entity.provider,
      providerTransactionId: entity.providerTransactionId,
      description: entity.description,
      metadata: entity.metadata,
      receiptUrl: entity.receiptUrl,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      completedAt: entity.completedAt,
      failureReason: entity.failureReason,
      refunds: entity.refunds?.map((r: any) => ({
        id: r.id,
        paymentId: r.paymentId,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        failureReason: r.failureReason,
      })),
    };
  }
}
