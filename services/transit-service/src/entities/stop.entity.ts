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
import { Point } from 'geojson';
import { LocationType, WheelchairBoarding } from '@openmaas/types';
import { StopTimeEntity } from './stop-time.entity';

@Entity({ name: 'stops', schema: 'transit' })
@Index(['stopLat', 'stopLon'])
@Index(['feedId'])
export class StopEntity {
  @PrimaryColumn({ name: 'stop_id' })
  stopId: string;

  @Column({ name: 'stop_code', nullable: true })
  stopCode?: string;

  @Column({ name: 'stop_name' })
  stopName: string;

  @Column({ name: 'stop_desc', nullable: true })
  stopDesc?: string;

  @Column({ name: 'stop_lat', type: 'decimal', precision: 10, scale: 8 })
  stopLat: number;

  @Column({ name: 'stop_lon', type: 'decimal', precision: 11, scale: 8 })
  stopLon: number;

  @Column({
    name: 'location',
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: Point;

  @Column({ name: 'zone_id', nullable: true })
  zoneId?: string;

  @Column({ name: 'stop_url', nullable: true })
  stopUrl?: string;

  @Column({
    name: 'location_type',
    type: 'smallint',
    default: LocationType.STOP,
  })
  locationType: LocationType;

  @Column({ name: 'parent_station', nullable: true })
  parentStation?: string;

  @ManyToOne(() => StopEntity, { nullable: true })
  @JoinColumn({ name: 'parent_station' })
  parent?: StopEntity;

  @OneToMany(() => StopEntity, (stop) => stop.parent)
  children: StopEntity[];

  @Column({ name: 'stop_timezone', nullable: true })
  stopTimezone?: string;

  @Column({
    name: 'wheelchair_boarding',
    type: 'smallint',
    default: WheelchairBoarding.NO_INFO,
  })
  wheelchairBoarding: WheelchairBoarding;

  @Column({ name: 'feed_id' })
  feedId: string;

  @OneToMany(() => StopTimeEntity, (stopTime) => stopTime.stop)
  stopTimes: StopTimeEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
