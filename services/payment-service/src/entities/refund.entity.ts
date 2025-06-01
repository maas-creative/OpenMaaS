import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RefundStatus } from '@openmaas/types';
import { PaymentEntity } from './payment.entity';

@Entity({ name: 'refunds', schema: 'payment' })
@Index(['paymentId'])
@Index(['status'])
@Index(['createdAt'])
export class RefundEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id' })
  paymentId: string;

  @ManyToOne(() => PaymentEntity, (payment) => payment.refunds)
  @JoinColumn({ name: 'payment_id' })
  payment: PaymentEntity;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'currency', length: 3 })
  currency: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({ name: 'reason', nullable: true })
  reason?: string;

  @Column({ name: 'stripe_refund_id', nullable: true })
  stripeRefundId?: string;

  @Column({ name: 'provider_refund_id', nullable: true })
  providerRefundId?: string;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason?: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
