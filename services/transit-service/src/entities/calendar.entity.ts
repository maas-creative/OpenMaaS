import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity({ name: 'calendars', schema: 'transit' })
@Index(['feedId'])
export class CalendarEntity {
  @PrimaryColumn({ name: 'service_id' })
  serviceId!: string;

  @Column({ name: 'monday', type: 'boolean' })
  monday!: boolean;

  @Column({ name: 'tuesday', type: 'boolean' })
  tuesday!: boolean;

  @Column({ name: 'wednesday', type: 'boolean' })
  wednesday!: boolean;

  @Column({ name: 'thursday', type: 'boolean' })
  thursday!: boolean;

  @Column({ name: 'friday', type: 'boolean' })
  friday!: boolean;

  @Column({ name: 'saturday', type: 'boolean' })
  saturday!: boolean;

  @Column({ name: 'sunday', type: 'boolean' })
  sunday!: boolean;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: Date;

  @Column({ name: 'feed_id' })
  feedId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
