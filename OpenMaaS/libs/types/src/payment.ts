export interface Payment {
  id: string;
  userId: string;
  bookingId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: PaymentProvider;
  providerTransactionId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failureReason?: string;
  refunds?: Refund[];
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  provider: PaymentProvider;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName?: string;
  isDefault?: boolean;
  metadata?: Record<string, any>;
}

export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIGITAL_WALLET = 'digital_wallet',
  STORED_VALUE = 'stored_value',
  MOBILE_PAYMENT = 'mobile_payment',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  ADYEN = 'adyen',
  PAYPAY = 'paypay',
  LINE_PAY = 'line_pay',
  SUICA = 'suica',
  PASMO = 'pasmo',
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  createdAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface CreatePaymentDto {
  userId: string;
  bookingId?: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  description?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
}

export interface ProcessPaymentDto {
  paymentIntentId?: string;
  paymentMethodId?: string;
  confirmationDetails?: any;
}

export interface CreateRefundDto {
  paymentId: string;
  amount?: number; // If not specified, full refund
  reason?: string;
}

export interface PaymentSession {
  id: string;
  clientSecret?: string;
  paymentIntentId?: string;
  amount: number;
  currency: string;
  status: string;
  expiresAt: Date;
}

export interface WalletBalance {
  userId: string;
  balance: number;
  currency: string;
  lastUpdated: Date;
  pendingCharges: number;
  availableBalance: number;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  balance: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
  createdAt: Date;
}

export enum WalletTransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}