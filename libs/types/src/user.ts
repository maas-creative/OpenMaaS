export enum UserRole {
  USER = 'user',
  TRANSPORT_OPERATOR = 'transport_operator',
  TICKET_PROVIDER = 'ticket_provider',
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
  metadata?: Record<string, unknown>;
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
  metadata?: Record<string, unknown>;
}

// Transport Operator specific types
export interface TransportOperatorData {
  operatorId: string;
  operatorName: string;
  operatorType: 'rail' | 'bus' | 'ferry' | 'tram' | 'subway';
  coverageArea: string[];
  fleetSize: number;
  activeRoutes: number;
  certifications: string[];
  permissions: {
    canManageSchedules: boolean;
    canViewAnalytics: boolean;
    canManageFleet: boolean;
    canSetPricing: boolean;
    canViewFinancials: boolean;
    canManageStaff: boolean;
  };
}

// Ticket Provider specific types
export interface TicketProviderData {
  providerId: string;
  providerName: string;
  providerType: 'travel_agency' | 'tour_operator' | 'online_platform';
  supportedTransportTypes: string[];
  commissionRate: number;
  contractStartDate: Date;
  contractEndDate: Date;
  permissions: {
    canCreatePackages: boolean;
    canSetPricing: boolean;
    canViewSalesData: boolean;
    canManageInventory: boolean;
    canIssueRefunds: boolean;
    canAccessCustomerData: boolean;
  };
}

// Extended User type with organization data
export interface UserWithOrganization extends User {
  organizationData?: TransportOperatorData | TicketProviderData;
}
