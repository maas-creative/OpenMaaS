import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentMethodType, PaymentProvider, RefundStatus } from '@openmaas/types';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  bookingId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty()
  @IsString()
  currency!: string;

  @ApiProperty()
  @IsString()
  paymentMethodId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  returnUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CreatePaymentMethodDto {
  @ApiProperty()
  @IsString()
  stripePaymentMethodId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ProcessPaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentIntentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  confirmationDetails?: any;
}

export class CreateRefundDto {
  @ApiProperty()
  @IsString()
  paymentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  bookingId?: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty()
  paymentMethodId!: string;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiPropertyOptional()
  providerTransactionId?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  receiptUrl?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  failureReason?: string;

  @ApiPropertyOptional()
  refunds?: RefundResponseDto[];
}

export class RefundResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  paymentId!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: RefundStatus })
  status!: RefundStatus;

  @ApiPropertyOptional()
  reason?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  failureReason?: string;
}

export class PaymentMethodResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: PaymentMethodType })
  type!: PaymentMethodType;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiPropertyOptional()
  last4?: string;

  @ApiPropertyOptional()
  brand?: string;

  @ApiPropertyOptional()
  expiryMonth?: number;

  @ApiPropertyOptional()
  expiryYear?: number;

  @ApiPropertyOptional()
  holderName?: string;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class PaymentSessionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientSecret!: string;

  @ApiProperty()
  paymentIntentId!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  expiresAt!: Date;

  @ApiPropertyOptional()
  publishableKey?: string;
}

export class PaymentHistoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
