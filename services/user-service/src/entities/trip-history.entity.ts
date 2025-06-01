import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export interface TripLeg {
  mode: string;
  from: {
    name: string;
    lat: number;
    lon: number;
  };
  to: {
    name: string;
    lat: number;
    lon: number;
  };
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  distance: number; // meters
  routeId?: string;
  tripId?: string;
  agencyId?: string;
}

@Entity('trip_history')
@Index(['userId', 'startTime'])
export class TripHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.tripHistory)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @Column({ name: 'start_time' })
  @Index()
  startTime: Date;

  @Column({ name: 'end_time' })
  endTime: Date;

  @Column()
  duration: number; // seconds

  @Column({ name: 'total_distance' })
  totalDistance: number; // meters

  @Column({ name: 'walk_distance' })
  walkDistance: number; // meters

  @Column()
  transfers: number;

  @Column({ type: 'jsonb' })
  legs: TripLeg[];

  @Column({ type: 'jsonb', nullable: true })
  fare?: {
    amount: number;
    currency: string;
  };

  @Column({
    type: 'enum',
    enum: ['planned', 'completed', 'cancelled', 'modified'],
    default: 'planned',
  })
  status: 'planned' | 'completed' | 'cancelled' | 'modified';

  @Column({ type: 'jsonb', nullable: true })
  feedback?: {
    rating?: number;
    comment?: string;
    issues?: string[];
  };

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Computed properties
  get modes(): string[] {
    return [...new Set(this.legs.map((leg) => leg.mode))];
  }

  get mainMode(): string {
    // Return the mode with the longest distance
    const modeDistances = this.legs.reduce(
      (acc, leg) => {
        acc[leg.mode] = (acc[leg.mode] || 0) + leg.distance;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(modeDistances).sort(([, a], [, b]) => b - a)[0]?.[0] || 'WALK';
  }

  get origin(): { name: string; lat: number; lon: number } | null {
    return this.legs[0]?.from || null;
  }

  get destination(): { name: string; lat: number; lon: number } | null {
    return this.legs[this.legs.length - 1]?.to || null;
  }

  // Helper methods
  markAsCompleted(): void {
    this.status = 'completed';
  }

  markAsCancelled(): void {
    this.status = 'cancelled';
  }

  addFeedback(rating: number, comment?: string, issues?: string[]): void {
    this.feedback = {
      rating,
      comment,
      issues,
    };
  }
}
