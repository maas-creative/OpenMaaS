import Stripe from 'stripe';

export interface StripeConfig {
  secretKey: string;
  apiVersion: string;
  webhookSecret: string;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface AttachPaymentMethodParams {
  paymentMethodId: string;
  customerId: string;
}

export interface CreateRefundParams {
  chargeId?: string;
  paymentIntentId?: string;
  amount?: number;
  reason?: Stripe.RefundCreateParams.Reason;
  metadata?: Record<string, string>;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: any;
  };
  created: number;
  id: string;
}

export interface PaymentIntentWebhookData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  charges?: {
    data: Array<{
      id: string;
      receipt_url?: string;
    }>;
  };
  metadata?: Record<string, string>;
}

export interface RefundWebhookData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  charge: string;
  payment_intent: string;
  reason?: string;
  metadata?: Record<string, string>;
}