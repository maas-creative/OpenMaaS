import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentMethodRepository } from '../repositories/payment-method.repository';
import { StripeService } from './stripe.service';
import { CreatePaymentMethodDto, PaymentMethodResponseDto } from '../dto/payment.dto';
import { PaymentMethodType, PaymentProvider } from '@openmaas/types';

@Injectable()
export class PaymentMethodService {
  private readonly logger = new Logger(PaymentMethodService.name);

  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly stripeService: StripeService,
  ) {}

  async addPaymentMethod(userId: string, dto: CreatePaymentMethodDto): Promise<PaymentMethodResponseDto> {
    try {
      // Check if payment method already exists
      const existing = await this.paymentMethodRepository.findByStripePaymentMethodId(dto.stripePaymentMethodId);
      if (existing) {
        throw new BadRequestException('Payment method already exists');
      }

      // Get or create Stripe customer
      let stripeCustomerId: string;
      const existingMethods = await this.paymentMethodRepository.findAll(userId);
      
      if (existingMethods.length > 0 && existingMethods[0].stripeCustomerId) {
        stripeCustomerId = existingMethods[0].stripeCustomerId;
      } else {
        const customer = await this.stripeService.createCustomer({
          email: `user_${userId}@openmaas.app`, // In production, get from user service
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
      }

      // Attach payment method to customer
      const stripePaymentMethod = await this.stripeService.attachPaymentMethod({
        paymentMethodId: dto.stripePaymentMethodId,
        customerId: stripeCustomerId,
      });

      // Create payment method record
      const paymentMethod = await this.paymentMethodRepository.create({
        userId,
        type: this.mapStripeType(stripePaymentMethod.type),
        provider: PaymentProvider.STRIPE,
        stripePaymentMethodId: stripePaymentMethod.id,
        stripeCustomerId,
        last4: stripePaymentMethod.card?.last4,
        brand: stripePaymentMethod.card?.brand,
        expiryMonth: stripePaymentMethod.card?.exp_month,
        expiryYear: stripePaymentMethod.card?.exp_year,
        holderName: stripePaymentMethod.billing_details?.name,
        isDefault: dto.setAsDefault || existingMethods.length === 0,
        metadata: dto.metadata,
        billingDetails: stripePaymentMethod.billing_details,
      });

      // Set as default if requested
      if (dto.setAsDefault && existingMethods.length > 0) {
        await this.paymentMethodRepository.setAsDefault(userId, paymentMethod.id);
      }

      this.logger.log(`Added payment method ${paymentMethod.id} for user ${userId}`);
      return this.toResponseDto(paymentMethod);
    } catch (error) {
      this.logger.error(`Error adding payment method for user ${userId}:`, error);
      throw error;
    }
  }

  async getPaymentMethods(userId: string): Promise<PaymentMethodResponseDto[]> {
    const methods = await this.paymentMethodRepository.findAll(userId);
    return methods.map(m => this.toResponseDto(m));
  }

  async getPaymentMethod(userId: string, paymentMethodId: string): Promise<PaymentMethodResponseDto> {
    const method = await this.paymentMethodRepository.findByUserAndId(userId, paymentMethodId);
    
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    return this.toResponseDto(method);
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<PaymentMethodResponseDto> {
    const method = await this.paymentMethodRepository.findByUserAndId(userId, paymentMethodId);
    
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    await this.paymentMethodRepository.setAsDefault(userId, paymentMethodId);
    
    const updated = await this.paymentMethodRepository.findById(paymentMethodId);
    this.logger.log(`Set payment method ${paymentMethodId} as default for user ${userId}`);
    
    return this.toResponseDto(updated);
  }

  async removePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    const method = await this.paymentMethodRepository.findByUserAndId(userId, paymentMethodId);
    
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    if (method.isDefault) {
      // Check if there are other payment methods
      const methods = await this.paymentMethodRepository.findAll(userId);
      if (methods.length <= 1) {
        throw new BadRequestException('Cannot remove the only payment method');
      }
    }

    try {
      // Detach from Stripe
      if (method.stripePaymentMethodId) {
        await this.stripeService.detachPaymentMethod(method.stripePaymentMethodId);
      }

      // Deactivate in database
      await this.paymentMethodRepository.deactivate(paymentMethodId);

      // If it was default, set another as default
      if (method.isDefault) {
        const remainingMethods = await this.paymentMethodRepository.findAll(userId);
        if (remainingMethods.length > 0) {
          await this.paymentMethodRepository.setAsDefault(userId, remainingMethods[0].id);
        }
      }

      this.logger.log(`Removed payment method ${paymentMethodId} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error removing payment method ${paymentMethodId}:`, error);
      throw new BadRequestException('Failed to remove payment method');
    }
  }

  async syncStripePaymentMethods(userId: string): Promise<void> {
    try {
      const methods = await this.paymentMethodRepository.findAll(userId);
      if (methods.length === 0 || !methods[0].stripeCustomerId) {
        return;
      }

      const stripeCustomerId = methods[0].stripeCustomerId;
      const stripeMethods = await this.stripeService.listPaymentMethods(stripeCustomerId);

      // Sync with database
      for (const stripeMethod of stripeMethods) {
        const existing = await this.paymentMethodRepository.findByStripePaymentMethodId(stripeMethod.id);
        
        if (!existing) {
          // Add new payment method found in Stripe
          await this.paymentMethodRepository.create({
            userId,
            type: this.mapStripeType(stripeMethod.type),
            provider: PaymentProvider.STRIPE,
            stripePaymentMethodId: stripeMethod.id,
            stripeCustomerId,
            last4: stripeMethod.card?.last4,
            brand: stripeMethod.card?.brand,
            expiryMonth: stripeMethod.card?.exp_month,
            expiryYear: stripeMethod.card?.exp_year,
            holderName: stripeMethod.billing_details?.name,
            isDefault: false,
            billingDetails: stripeMethod.billing_details,
          });
        }
      }

      this.logger.log(`Synced payment methods for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error syncing payment methods for user ${userId}:`, error);
    }
  }

  private mapStripeType(stripeType: string): PaymentMethodType {
    switch (stripeType) {
      case 'card':
        return PaymentMethodType.CREDIT_CARD;
      case 'bank_account':
        return PaymentMethodType.BANK_TRANSFER;
      default:
        return PaymentMethodType.DIGITAL_WALLET;
    }
  }

  private toResponseDto(entity: any): PaymentMethodResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      type: entity.type,
      provider: entity.provider,
      last4: entity.last4,
      brand: entity.brand,
      expiryMonth: entity.expiryMonth,
      expiryYear: entity.expiryYear,
      holderName: entity.holderName,
      isDefault: entity.isDefault,
      createdAt: entity.createdAt,
    };
  }
}