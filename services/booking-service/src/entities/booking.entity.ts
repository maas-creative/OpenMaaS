import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  BookingStatus,
  BookingType,
  Passenger,
  BookingItinerary,
  BookingFare,
  CancellationPolicy,
} from '@openmaas/types';

@Entity({ name: 'bookings', schema: 'booking' })
@Index(['userId'])
@Index(['status'])
@Index(['confirmationCode'], { unique: true })
@Index(['createdAt'])
@Index(['validFrom', 'validUntil'])
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  @Index()
  userId!: string; // References User.id from user-service

  @Column({ name: 'trip_id' })
  tripId!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status!: BookingStatus;

  @Column({
    name: 'booking_type',
    type: 'enum',
    enum: BookingType,
  })
  bookingType!: BookingType;

  @Column({
    name: 'passengers',
    type: 'jsonb',
  })
  passengers!: Passenger[];

  @Column({
    name: 'itinerary',
    type: 'jsonb',
  })
  itinerary!: BookingItinerary;

  @Column({
    name: 'fare',
    type: 'jsonb',
  })
  fare!: BookingFare;

  @Column({ name: 'payment_id', nullable: true })
  @Index()
  paymentId?: string; // References Payment.id from payment-service

  @Column({ name: 'confirmation_code', unique: true })
  confirmationCode!: string;

  @Column({ name: 'qr_code', nullable: true })
  qrCode?: string;

  @Column({ name: 'valid_from', type: 'timestamp' })
  validFrom!: Date;

  @Column({ name: 'valid_until', type: 'timestamp' })
  validUntil!: Date;

  @Column({
    name: 'cancellation_policy',
    type: 'jsonb',
    nullable: true,
  })
  cancellationPolicy?: CancellationPolicy;

  @Column({
    name: 'metadata',
    type: 'jsonb',
    nullable: true,
  })
  metadata?: Record<string, any>;

  @Column({ name: 'provider_booking_id', nullable: true })
  providerBookingId?: string;

  @Column({ name: 'provider_name', nullable: true })
  providerName?: string;

  @Column({ name: 'external_reference', nullable: true })
  externalReference?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', nullable: true })
  cancellationReason?: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount?: number;

  @Column({ name: 'refund_status', nullable: true })
  refundStatus?: string;
}
