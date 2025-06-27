import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserRole, UserProfile, UserPreferences } from '@openmaas/types';
import { TripHistory } from './trip-history.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, name: 'external_id' })
  @Index()
  externalId!: string; // Keycloak ID

  @Column({ unique: true })
  @Index()
  email!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({
    type: 'simple-array',
    default: 'user',
  })
  roles!: UserRole[];

  @Column({ type: 'jsonb', default: {} })
  profile!: UserProfile;

  @Column({ type: 'jsonb', default: {} })
  preferences!: UserPreferences;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => TripHistory, (tripHistory) => tripHistory.user)
  tripHistory!: TripHistory[];

  // Virtual properties
  get fullName(): string {
    if (this.profile?.firstName && this.profile?.lastName) {
      return `${this.profile.firstName} ${this.profile.lastName}`;
    }
    return this.profile?.displayName || this.email;
  }

  get isAdmin(): boolean {
    return this.roles.includes(UserRole.ADMIN);
  }

  get isOperator(): boolean {
    return this.roles.includes(UserRole.TRANSPORT_OPERATOR);
  }

  // Helper methods
  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  addRole(role: UserRole): void {
    if (!this.roles.includes(role)) {
      this.roles.push(role);
    }
  }

  removeRole(role: UserRole): void {
    this.roles = this.roles.filter((r) => r !== role);
  }

  updateProfile(updates: Partial<UserProfile>): void {
    this.profile = {
      ...this.profile,
      ...updates,
    };
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...updates,
    };
  }

  updateMetadata(key: string, value: unknown): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }
}
