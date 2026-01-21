import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';
import { UserData } from '@/services/auth';

const mockUser: UserData = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

const mockAccessToken = 'mock-access-token';
const mockRefreshToken = 'mock-refresh-token';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  describe('initial state', () => {
    it('starts with unauthenticated state', () => {
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setAuth', () => {
    it('sets user and tokens', () => {
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);
      
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe(mockAccessToken);
      expect(state.refreshToken).toBe(mockRefreshToken);
      expect(state.isAuthenticated).toBe(true);
    });

    it('stores tokens in localStorage', () => {
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);
      
      expect(localStorage.getItem('lms_access_token')).toBe(mockAccessToken);
      expect(localStorage.getItem('lms_refresh_token')).toBe(mockRefreshToken);
      expect(localStorage.getItem('lms_user')).toBe(JSON.stringify(mockUser));
    });
  });

  describe('updateAccessToken', () => {
    it('updates access token while preserving other state', () => {
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);
      
      const newToken = 'new-access-token';
      useAuthStore.getState().updateAccessToken(newToken);
      
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(newToken);
      expect(state.user).toEqual(mockUser);
      expect(state.refreshToken).toBe(mockRefreshToken);
      expect(state.isAuthenticated).toBe(true);
    });

    it('updates localStorage', () => {
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);
      
      const newToken = 'new-access-token';
      useAuthStore.getState().updateAccessToken(newToken);
      
      expect(localStorage.getItem('lms_access_token')).toBe(newToken);
    });
  });

  describe('clearAuth', () => {
    it('clears all auth state', () => {
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);
      useAuthStore.getState().clearAuth();
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('removes tokens from localStorage', () => {
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);
      useAuthStore.getState().clearAuth();
      
      expect(localStorage.getItem('lms_access_token')).toBeNull();
      expect(localStorage.getItem('lms_refresh_token')).toBeNull();
      expect(localStorage.getItem('lms_user')).toBeNull();
    });
  });

  describe('state persistence', () => {
    it('partializes state correctly for persistence', () => {
      useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);
      
      const persistedData = JSON.parse(
        localStorage.getItem('lms-auth-storage') || '{}'
      );
      
      expect(persistedData.state).toBeDefined();
      expect(persistedData.state.user).toEqual(mockUser);
      expect(persistedData.state.isAuthenticated).toBe(true);
    });
  });

  describe('role handling', () => {
    it('handles admin role', () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      useAuthStore.getState().setAuth(adminUser, mockAccessToken, mockRefreshToken);
      
      expect(useAuthStore.getState().user?.role).toBe('admin');
    });

    it('handles librarian role', () => {
      const librarianUser = { ...mockUser, role: 'librarian' as const };
      useAuthStore.getState().setAuth(librarianUser, mockAccessToken, mockRefreshToken);
      
      expect(useAuthStore.getState().user?.role).toBe('librarian');
    });

    it('handles student role', () => {
      const studentUser = { ...mockUser, role: 'student' as const };
      useAuthStore.getState().setAuth(studentUser, mockAccessToken, mockRefreshToken);
      
      expect(useAuthStore.getState().user?.role).toBe('student');
    });

    it('handles super_admin role', () => {
      const superAdminUser = { ...mockUser, role: 'super_admin' as const };
      useAuthStore.getState().setAuth(superAdminUser, mockAccessToken, mockRefreshToken);
      
      expect(useAuthStore.getState().user?.role).toBe('super_admin');
    });
  });
});
