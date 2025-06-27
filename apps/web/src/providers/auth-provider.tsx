'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserWithOrganization, UserRole } from '@openmaas/types';

interface AuthContextType {
  user: UserWithOrganization | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          // In a real app, validate token with backend
          // For now, set a mock user
          setUser({
            id: '1',
            externalId: 'keycloak-1',
            email: 'user@example.com',
            roles: [UserRole.USER],
            profile: {
              firstName: '太郎',
              lastName: '山田',
              displayName: '山田 太郎',
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
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, call auth API
      // For now, set a mock user
      const mockUser: UserWithOrganization = {
        id: '1',
        externalId: 'keycloak-1',
        email,
        roles: [UserRole.USER],
        profile: {
          firstName: '太郎',
          lastName: '山田',
          displayName: '山田 太郎',
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setUser(mockUser);
      localStorage.setItem('access_token', 'mock-token');
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('access_token');
      setUser(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    // In a real app, refresh the token
    // For now, just check session
    await checkSession();
  };

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setUser(null);
        return;
      }
      // Validate token and refresh if needed
    } catch (err) {
      setError(err as Error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}