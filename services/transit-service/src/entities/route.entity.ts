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
import { RouteType } from '@openmaas/types';
import { AgencyEntity } from './agency.entity';
import { TripEntity } from './trip.entity';

@Entity({ name: 'routes', schema: 'transit' })
@Index(['agencyId'])
@Index(['feedId'])
export class RouteEntity {
  @PrimaryColumn({ name: 'route_id' })
  routeId!: string;

  @Column({ name: 'agency_id', nullable: true })
  agencyId?: string;

  @ManyToOne(() => AgencyEntity, (agency) => agency.routes, { nullable: true })
  @JoinColumn({ name: 'agency_id' })
  agency?: AgencyEntity;

  @Column({ name: 'route_short_name', nullable: true })
  routeShortName?: string;

  @Column({ name: 'route_long_name' })
  routeLongName!: string;

  @Column({ name: 'route_desc', nullable: true })
  routeDesc?: string;

  @Column({ name: 'route_type', type: 'smallint' })
  routeType!: RouteType;

  @Column({ name: 'route_url', nullable: true })
  routeUrl?: string;

  @Column({ name: 'route_color', nullable: true })
  routeColor?: string;

  @Column({ name: 'route_text_color', nullable: true })
  routeTextColor?: string;

  @Column({ name: 'route_sort_order', nullable: true })
  routeSortOrder?: number;

  @Column({ name: 'feed_id' })
  feedId!: string;

  @OneToMany(() => TripEntity, (trip) => trip.route)
  trips!: TripEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
