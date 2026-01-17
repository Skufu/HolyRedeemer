import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, UserData } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/services/api';

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, setAuth, clearAuth, refreshToken } = useAuthStore();

  useEffect(() => {
    const storedToken = localStorage.getItem('lms_access_token');
    if (storedToken && user) {
      setIsLoading(false);
    } else if (!storedToken) {
      clearAuth();
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [user, clearAuth]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ username, password });

      if (response.success) {
        setAuth(response.data.user, response.data.access_token, response.data.refresh_token);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Login failed' };
    } catch (error: unknown) {
      setIsLoading(false);
      return { success: false, error: getErrorMessage(error) };
    }
  };

  const logout = async () => {
    try {
      await authService.logout(refreshToken || undefined);
    } finally {
      clearAuth();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export type UserRole = 'super_admin' | 'admin' | 'librarian' | 'student';

// eslint-disable-next-line react-refresh/only-export-components
export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    librarian: 'Librarian',
    student: 'Student',
  };
  return roleNames[role];
};

// eslint-disable-next-line react-refresh/only-export-components
export const getRoleBadgeColor = (role: UserRole): string => {
  const roleColors: Record<UserRole, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    admin: 'bg-primary/10 text-primary',
    librarian: 'bg-secondary/20 text-secondary-foreground',
    student: 'bg-info/10 text-info',
  };
  return roleColors[role];
};
