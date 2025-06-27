'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, type UserWithOrganization } from '@openmaas/types';
import { getMockUser, hasRole, checkPermission, getUserDashboardPath } from '@/lib/auth';

interface AuthContextType {
  user: UserWithOrganization | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get mock user
      const mockUser = getMockUser(email);
      if (!mockUser) {
        throw new Error('ユーザーが見つかりません');
      }

      // In real app, verify password here
      // For demo, any password works
      
      // Store user in state and localStorage
      setUser(mockUser);
      localStorage.setItem('currentUser', JSON.stringify(mockUser));
      
      // Redirect to appropriate dashboard
      const dashboardPath = getUserDashboardPath(mockUser);
      router.push(dashboardPath);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('currentUser');
    router.push('/');
  }, [router]);

  const hasRoleCheck = useCallback((role: UserRole) => {
    return hasRole(user, role);
  }, [user]);

  const hasPermissionCheck = useCallback((permission: string) => {
    return checkPermission(user, permission);
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasRole: hasRoleCheck,
    hasPermission: hasPermissionCheck,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    roles?: UserRole[];
    permissions?: string[];
    redirectTo?: string;
  }
) {
  return function ProtectedComponent(props: P) {
    const { user, isLoading, hasRole, hasPermission } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push(options?.redirectTo || '/login');
        return;
      }

      // Check role requirements
      if (options?.roles && !options.roles.some(role => hasRole(role))) {
        router.push('/unauthorized');
        return;
      }

      // Check permission requirements
      if (options?.permissions && !options.permissions.some(perm => hasPermission(perm))) {
        router.push('/unauthorized');
        return;
      }
    }, [user, isLoading, hasRole, hasPermission, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    // Check role requirements
    if (options?.roles && !options.roles.some(role => hasRole(role))) {
      return null;
    }

    // Check permission requirements
    if (options?.permissions && !options.permissions.some(perm => hasPermission(perm))) {
      return null;
    }

    return <Component {...props} />;
  };
}