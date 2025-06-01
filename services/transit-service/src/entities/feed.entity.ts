import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'feeds', schema: 'transit' })
@Index(['providerId'])
export class FeedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'feed_id', unique: true })
  feedId: string;

  @Column({ name: 'provider_id' })
  providerId: string;

  @Column({ name: 'provider_name' })
  providerName: string;

  @Column({ name: 'feed_url' })
  feedUrl: string;

  @Column({ name: 'feed_type', default: 'gtfs' })
  feedType: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_updated', type: 'timestamp', nullable: true })
  lastUpdated?: Date;

  @Column({ name: 'last_fetch_attempt', type: 'timestamp', nullable: true })
  lastFetchAttempt?: Date;

  @Column({ name: 'last_fetch_error', nullable: true })
  lastFetchError?: string;

  @Column({ name: 'update_frequency', type: 'integer', default: 86400 })
  updateFrequency: number; // seconds

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
