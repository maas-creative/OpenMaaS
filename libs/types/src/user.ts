export enum UserRole {
  USER = 'user',
  OPERATOR = 'operator',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  externalId: string; // Keycloak ID
  email: string;
  phone?: string;
  roles: UserRole[];
  profile: UserProfile;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  dateOfBirth?: Date;
  address?: Address;
  profilePicture?: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface UserPreferences {
  language: string;
  currency: string;
  timezone: string;
  notifications: NotificationPreferences;
  accessibility?: AccessibilityPreferences;
  defaultPaymentMethod?: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  tripReminders: boolean;
  serviceAlerts: boolean;
  promotions: boolean;
}

export interface AccessibilityPreferences {
  wheelchairAccess?: boolean;
  audioAnnouncements?: boolean;
  largeText?: boolean;
  preferredWalkingSpeed?: 'slow' | 'normal' | 'fast';
}

export interface CreateUserDto {
  externalId: string;
  email: string;
  phone?: string;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserDto {
  email?: string;
  phone?: string;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
  metadata?: Record<string, any>;
}