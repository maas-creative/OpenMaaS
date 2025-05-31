import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { PaymentStatus, PaymentProvider } from '@openmaas/types';
import { RefundEntity } from './refund.entity';

@Entity({ name: 'payments', schema: 'payment' })
@Index(['userId'])
@Index(['bookingId'])
@Index(['status'])
@Index(['providerTransactionId'])
@Index(['createdAt'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'currency', length: 3 })
  currency: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ name: 'payment_method_id' })
  paymentMethodId: string;

  @Column({
    name: 'provider',
    type: 'enum',
    enum: PaymentProvider,
  })
  provider: PaymentProvider;

  @Column({ name: 'provider_transaction_id', nullable: true })
  providerTransactionId?: string;

  @Column({ name: 'stripe_payment_intent_id', nullable: true })
  stripePaymentIntentId?: string;

  @Column({ name: 'stripe_charge_id', nullable: true })
  stripeChargeId?: string;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason?: string;

  @Column({ name: 'failure_code', nullable: true })
  failureCode?: string;

  @Column({ name: 'idempotency_key', nullable: true, unique: true })
  idempotencyKey?: string;

  @Column({ name: 'receipt_url', nullable: true })
  receiptUrl?: string;

  @Column({ name: 'refunded_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundedAmount: number;

  @OneToMany(() => RefundEntity, (refund) => refund.payment)
  refunds: RefundEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}