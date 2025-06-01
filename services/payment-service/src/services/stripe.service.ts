import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  CreatePaymentIntentParams,
  CreateCustomerParams,
  AttachPaymentMethodParams,
  CreateRefundParams,
} from '../interfaces/stripe.interfaces';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get('stripe.secretKey');
    const apiVersion = this.configService.get('stripe.apiVersion');

    if (!secretKey) {
      throw new Error('Stripe secret key is not configured');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: apiVersion as Stripe.LatestApiVersion,
      typescript: true,
    });
  }

  async createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.name,
        phone: params.phone,
        metadata: params.metadata,
      });

      this.logger.log(`Created Stripe customer: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error('Failed to create Stripe customer:', error);
      throw new BadRequestException('Failed to create customer');
    }
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        return null;
      }
      return customer as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Failed to get Stripe customer ${customerId}:`, error);
      return null;
    }
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: params.amount,
        currency: params.currency,
        automatic_payment_methods: {
          enabled: true,
        },
        description: params.description,
        metadata: params.metadata,
      };

      if (params.customerId) {
        paymentIntentParams.customer = params.customerId;
      }

      if (params.paymentMethodId) {
        paymentIntentParams.payment_method = params.paymentMethodId;
      }

      if (params.returnUrl) {
        paymentIntentParams.return_url = params.returnUrl;
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

      this.logger.log(`Created payment intent: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create payment intent:', error);
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const params: Stripe.PaymentIntentConfirmParams = {};

      if (paymentMethodId) {
        params.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, params);

      this.logger.log(`Confirmed payment intent: ${paymentIntentId}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(`Failed to confirm payment intent ${paymentIntentId}:`, error);
      throw new BadRequestException('Failed to confirm payment');
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['payment_method', 'charges.data'],
      });
    } catch (error) {
      this.logger.error(`Failed to get payment intent ${paymentIntentId}:`, error);
      throw new BadRequestException('Payment intent not found');
    }
  }

  async attachPaymentMethod(params: AttachPaymentMethodParams): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(params.paymentMethodId, {
        customer: params.customerId,
      });

      this.logger.log(
        `Attached payment method ${params.paymentMethodId} to customer ${params.customerId}`,
      );
      return paymentMethod;
    } catch (error) {
      this.logger.error('Failed to attach payment method:', error);
      throw new BadRequestException('Failed to attach payment method');
    }
  }

  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      this.logger.error(`Failed to list payment methods for customer ${customerId}:`, error);
      return [];
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);

      this.logger.log(`Detached payment method: ${paymentMethodId}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error(`Failed to detach payment method ${paymentMethodId}:`, error);
      throw new BadRequestException('Failed to detach payment method');
    }
  }

  async createRefund(params: CreateRefundParams): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        reason: params.reason,
        metadata: params.metadata,
      };

      if (params.chargeId) {
        refundParams.charge = params.chargeId;
      } else if (params.paymentIntentId) {
        refundParams.payment_intent = params.paymentIntentId;
      } else {
        throw new BadRequestException('Either chargeId or paymentIntentId is required');
      }

      if (params.amount) {
        refundParams.amount = params.amount;
      }

      const refund = await this.stripe.refunds.create(refundParams);

      this.logger.log(`Created refund: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error('Failed to create refund:', error);
      throw new BadRequestException('Failed to create refund');
    }
  }

  async getRefund(refundId: string): Promise<Stripe.Refund> {
    try {
      return await this.stripe.refunds.retrieve(refundId);
    } catch (error) {
      this.logger.error(`Failed to get refund ${refundId}:`, error);
      throw new BadRequestException('Refund not found');
    }
  }

  async constructWebhookEvent(payload: string | Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = this.configService.get('stripe.webhookSecret');

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Failed to construct webhook event:', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }
}
