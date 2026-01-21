import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserData } from '@/services/auth';

interface AuthState {
  user: UserData | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: UserData, accessToken: string, refreshToken: string) => void;
  updateAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('lms_access_token', accessToken);
        localStorage.setItem('lms_refresh_token', refreshToken);
        localStorage.setItem('lms_user', JSON.stringify(user));
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      updateAccessToken: (accessToken) => {
        localStorage.setItem('lms_access_token', accessToken);
        set({ accessToken });
      },

      clearAuth: () => {
        localStorage.removeItem('lms_access_token');
        localStorage.removeItem('lms_refresh_token');
        localStorage.removeItem('lms_user');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'lms-auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
