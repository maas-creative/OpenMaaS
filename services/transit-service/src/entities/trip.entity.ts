import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { WheelchairAccessible, BikesAllowed } from '@openmaas/types';
import { RouteEntity } from './route.entity';
import { StopTimeEntity } from './stop-time.entity';
import { ShapeEntity } from './shape.entity';

@Entity({ name: 'trips', schema: 'transit' })
@Index(['routeId'])
@Index(['serviceId'])
@Index(['feedId'])
export class TripEntity {
  @PrimaryColumn({ name: 'trip_id' })
  tripId: string;

  @Column({ name: 'route_id' })
  routeId: string;

  @ManyToOne(() => RouteEntity, (route) => route.trips)
  @JoinColumn({ name: 'route_id' })
  route: RouteEntity;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({ name: 'trip_headsign', nullable: true })
  tripHeadsign?: string;

  @Column({ name: 'trip_short_name', nullable: true })
  tripShortName?: string;

  @Column({ name: 'direction_id', nullable: true })
  directionId?: number;

  @Column({ name: 'block_id', nullable: true })
  blockId?: string;

  @Column({ name: 'shape_id', nullable: true })
  shapeId?: string;

  @ManyToOne(() => ShapeEntity, { nullable: true })
  @JoinColumn({ name: 'shape_id' })
  shape?: ShapeEntity;

  @Column({
    name: 'wheelchair_accessible',
    type: 'smallint',
    default: WheelchairAccessible.NO_INFO,
  })
  wheelchairAccessible: WheelchairAccessible;

  @Column({
    name: 'bikes_allowed',
    type: 'smallint',
    default: BikesAllowed.NO_INFO,
  })
  bikesAllowed: BikesAllowed;

  @Column({ name: 'feed_id' })
  feedId: string;

  @OneToMany(() => StopTimeEntity, (stopTime) => stopTime.trip)
  stopTimes: StopTimeEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
