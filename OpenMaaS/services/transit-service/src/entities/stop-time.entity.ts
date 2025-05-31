import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { PickupDropOffType, ContinuousPickupDropOff, Timepoint } from '@openmaas/types';
import { TripEntity } from './trip.entity';
import { StopEntity } from './stop.entity';

@Entity({ name: 'stop_times', schema: 'transit' })
@Index(['tripId', 'stopSequence'])
@Index(['stopId'])
@Index(['feedId'])
export class StopTimeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'trip_id' })
  tripId: string;

  @ManyToOne(() => TripEntity, (trip) => trip.stopTimes)
  @JoinColumn({ name: 'trip_id' })
  trip: TripEntity;

  @Column({ name: 'arrival_time' })
  arrivalTime: string;

  @Column({ name: 'departure_time' })
  departureTime: string;

  @Column({ name: 'stop_id' })
  stopId: string;

  @ManyToOne(() => StopEntity, (stop) => stop.stopTimes)
  @JoinColumn({ name: 'stop_id' })
  stop: StopEntity;

  @Column({ name: 'stop_sequence' })
  stopSequence: number;

  @Column({ name: 'stop_headsign', nullable: true })
  stopHeadsign?: string;

  @Column({
    name: 'pickup_type',
    type: 'smallint',
    default: PickupDropOffType.REGULAR,
  })
  pickupType: PickupDropOffType;

  @Column({
    name: 'drop_off_type',
    type: 'smallint',
    default: PickupDropOffType.REGULAR,
  })
  dropOffType: PickupDropOffType;

  @Column({
    name: 'continuous_pickup',
    type: 'smallint',
    default: ContinuousPickupDropOff.NOT_CONTINUOUS,
    nullable: true,
  })
  continuousPickup?: ContinuousPickupDropOff;

  @Column({
    name: 'continuous_drop_off',
    type: 'smallint',
    default: ContinuousPickupDropOff.NOT_CONTINUOUS,
    nullable: true,
  })
  continuousDropOff?: ContinuousPickupDropOff;

  @Column({
    name: 'shape_dist_traveled',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  shapeDistTraveled?: number;

  @Column({
    name: 'timepoint',
    type: 'smallint',
    default: Timepoint.EXACT,
  })
  timepoint: Timepoint;

  @Column({ name: 'feed_id' })
  feedId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}