import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'booking_providers', schema: 'booking' })
@Index(['providerId'], { unique: true })
@Index(['isActive'])
export class BookingProviderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider_id', unique: true })
  providerId: string;

  @Column({ name: 'provider_name' })
  providerName: string;

  @Column({ name: 'provider_type' })
  providerType: string; // 'transit', 'rideshare', 'bikeshare', etc.

  @Column({ name: 'api_endpoint' })
  apiEndpoint: string;

  @Column({ name: 'api_key_id', nullable: true })
  apiKeyId?: string;

  @Column({ name: 'webhook_url', nullable: true })
  webhookUrl?: string;

  @Column({ name: 'supported_regions', type: 'jsonb', nullable: true })
  supportedRegions?: string[];

  @Column({ name: 'supported_modes', type: 'jsonb' })
  supportedModes: string[];

  @Column({ name: 'booking_configuration', type: 'jsonb' })
  bookingConfiguration: {
    requiresAdvanceBooking: boolean;
    maxAdvanceBookingDays: number;
    cancellationPolicy: {
      allowCancellation: boolean;
      cancellationDeadlineMinutes: number;
      cancellationFee: number;
    };
    supportedPaymentMethods: string[];
    realTimeAvailability: boolean;
  };

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_sync', type: 'timestamp', nullable: true })
  lastSync?: Date;

  @Column({ name: 'sync_status', nullable: true })
  syncStatus?: string;

  @Column({ name: 'error_count', default: 0 })
  errorCount: number;

  @Column({ name: 'last_error', nullable: true })
  lastError?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}