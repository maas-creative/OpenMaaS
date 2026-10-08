import { UserRole, type User, type UserWithOrganization } from '@openmaas/types';

// Mock authentication context
interface AuthContextType {
  user: UserWithOrganization | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
}

// Mock user data for development
const mockUsers: Record<string, UserWithOrganization> = {
  'user@example.com': {
    id: '1',
    externalId: 'keycloak-1',
    email: 'user@example.com',
    roles: [UserRole.USER],
    profile: {
      firstName: '太郎',
      lastName: '山田',
      displayName: '山田太郎',
    },
    preferences: {
      language: 'ja',
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      notifications: {
        email: true,
        push: true,
        sms: false,
        tripReminders: true,
        serviceAlerts: true,
        promotions: false,
      },
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  'operator@jr.example.com': {
    id: '2',
    externalId: 'keycloak-2',
    email: 'operator@jr.example.com',
    roles: [UserRole.TRANSPORT_OPERATOR],
    profile: {
      firstName: '次郎',
      lastName: '鈴木',
      displayName: 'JR東日本 運行管理者',
    },
    preferences: {
      language: 'ja',
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      notifications: {
        email: true,
        push: true,
        sms: true,
        tripReminders: false,
        serviceAlerts: true,
        promotions: false,
      },
    },
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2024-01-15'),
    organizationData: {
      operatorId: 'jr-east',
      operatorName: 'JR東日本',
      operatorType: 'rail',
      coverageArea: ['東京', '神奈川', '埼玉', '千葉', '茨城', '栃木', '群馬'],
      fleetSize: 1200,
      activeRoutes: 85,
      certifications: ['ISO9001', 'ISO14001'],
      permissions: {
        canManageSchedules: true,
        canViewAnalytics: true,
        canManageFleet: true,
        canSetPricing: false,
        canViewFinancials: true,
        canManageStaff: false,
      },
    },
  },
  'provider@jtb.example.com': {
    id: '3',
    externalId: 'keycloak-3',
    email: 'provider@jtb.example.com',
    roles: [UserRole.TICKET_PROVIDER],
    profile: {
      firstName: '花子',
      lastName: '佐藤',
      displayName: 'JTB 商品企画担当',
    },
    preferences: {
      language: 'ja',
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      notifications: {
        email: true,
        push: true,
        sms: false,
        tripReminders: false,
        serviceAlerts: true,
        promotions: true,
      },
    },
    createdAt: new Date('2023-09-01'),
    updatedAt: new Date('2024-01-15'),
    organizationData: {
      providerId: 'jtb-001',
      providerName: 'JTB',
      providerType: 'travel_agency',
      supportedTransportTypes: ['rail', 'bus', 'ferry', 'tram'],
      commissionRate: 0.08,
      contractStartDate: new Date('2023-01-01'),
      contractEndDate: new Date('2025-12-31'),
      permissions: {
        canCreatePackages: true,
        canSetPricing: true,
        canViewSalesData: true,
        canManageInventory: true,
        canIssueRefunds: true,
        canAccessCustomerData: false,
      },
    },
  },
  'admin@openmaas.example.com': {
    id: '4',
    externalId: 'keycloak-4',
    email: 'admin@openmaas.example.com',
    roles: [UserRole.ADMIN],
    profile: {
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'システム管理者',
    },
    preferences: {
      language: 'ja',
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
      notifications: {
        email: true,
        push: true,
        sms: true,
        tripReminders: false,
        serviceAlerts: true,
        promotions: false,
      },
    },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
};

// Permission checking utility
export function checkPermission(user: UserWithOrganization | null, permission: string): boolean {
  if (!user) return false;
  
  // Admin has all permissions
  if (user.roles.includes(UserRole.ADMIN)) return true;
  
  // Check organization-specific permissions
  if (user.organizationData && 'permissions' in user.organizationData) {
    const permissions = user.organizationData.permissions as Record<string, boolean>;
    return !!permissions[permission];
  }
  
  return false;
}

// Role checking utility
export function hasRole(user: UserWithOrganization | null, role: UserRole): boolean {
  if (!user) return false;
  return user.roles.includes(role);
}

// Get mock user by email
export function getMockUser(email: string): UserWithOrganization | null {
  return mockUsers[email] || null;
}

// Check if user can access admin routes
export function canAccessAdmin(user: UserWithOrganization | null): boolean {
  if (!user) return false;
  
  return (
    user.roles.includes(UserRole.ADMIN) ||
    user.roles.includes(UserRole.TRANSPORT_OPERATOR) ||
    user.roles.includes(UserRole.TICKET_PROVIDER)
  );
}

// Get user dashboard path based on role
export function getUserDashboardPath(user: UserWithOrganization | null): string {
  if (!user) return '/';
  
  if (user.roles.includes(UserRole.ADMIN)) {
    return '/admin';
  }
  
  if (user.roles.includes(UserRole.TRANSPORT_OPERATOR)) {
    return '/admin/transporter';
  }
  
  if (user.roles.includes(UserRole.TICKET_PROVIDER)) {
    return '/admin/provider';
  }
  
  return '/dashboard';
}

// Check specific permissions for transport operators
export function canManageSchedules(user: UserWithOrganization | null): boolean {
  return checkPermission(user, 'canManageSchedules');
}

export function canViewAnalytics(user: UserWithOrganization | null): boolean {
  return checkPermission(user, 'canViewAnalytics');
}

export function canManageFleet(user: UserWithOrganization | null): boolean {
  return checkPermission(user, 'canManageFleet');
}

export function canSetPricing(user: UserWithOrganization | null): boolean {
  return checkPermission(user, 'canSetPricing');
}

export function canViewFinancials(user: UserWithOrganization | null): boolean {
  return checkPermission(user, 'canViewFinancials');
}

// Check specific permissions for ticket providers
export function canCreatePackages(user: UserWithOrganization | null): boolean {
  return checkPermission(user, 'canCreatePackages');
}

export function canViewSalesData(user: UserWithOrganization | null): boolean {
  return checkPermission(user, 'canViewSalesData');
}

export function canManageInventory(user: UserWithOrganization | null): boolean {
  return checkPermission(user, 'canManageInventory');
}

export function canIssueRefunds(user: UserWithOrganization | null): boolean {
  return checkPermission(user, 'canIssueRefunds');
}