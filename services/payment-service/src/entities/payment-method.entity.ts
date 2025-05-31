import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { PaymentMethodType, PaymentProvider } from '@openmaas/types';

@Entity({ name: 'payment_methods', schema: 'payment' })
@Index(['userId'])
@Index(['stripePaymentMethodId'])
@Index(['isActive'])
export class PaymentMethodEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: PaymentMethodType,
  })
  type: PaymentMethodType;

  @Column({
    name: 'provider',
    type: 'enum',
    enum: PaymentProvider,
  })
  provider: PaymentProvider;

  @Column({ name: 'stripe_payment_method_id', nullable: true, unique: true })
  stripePaymentMethodId?: string;

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId?: string;

  @Column({ name: 'last4', nullable: true })
  last4?: string;

  @Column({ name: 'brand', nullable: true })
  brand?: string;

  @Column({ name: 'expiry_month', nullable: true })
  expiryMonth?: number;

  @Column({ name: 'expiry_year', nullable: true })
  expiryYear?: number;

  @Column({ name: 'holder_name', nullable: true })
  holderName?: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'billing_details', type: 'jsonb', nullable: true })
  billingDetails?: {
    address?: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postal_code?: string;
      state?: string;
    };
    email?: string;
    name?: string;
    phone?: string;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}