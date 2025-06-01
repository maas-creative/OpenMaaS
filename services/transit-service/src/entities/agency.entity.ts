import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RouteEntity } from './route.entity';

@Entity({ name: 'agencies', schema: 'transit' })
export class AgencyEntity {
  @PrimaryColumn({ name: 'agency_id' })
  agencyId: string;

  @Column({ name: 'agency_name' })
  agencyName: string;

  @Column({ name: 'agency_url', nullable: true })
  agencyUrl?: string;

  @Column({ name: 'agency_timezone' })
  agencyTimezone: string;

  @Column({ name: 'agency_lang', nullable: true })
  agencyLang?: string;

  @Column({ name: 'agency_phone', nullable: true })
  agencyPhone?: string;

  @Column({ name: 'agency_fare_url', nullable: true })
  agencyFareUrl?: string;

  @Column({ name: 'feed_id' })
  feedId: string;

  @OneToMany(() => RouteEntity, (route) => route.agency)
  routes: RouteEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
