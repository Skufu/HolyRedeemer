import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from './auth';
import { server } from '@/test/setup';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3847/api/v1';

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('login', () => {
    it('returns user and tokens on successful login', async () => {
      const response = await authService.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(response.success).toBe(true);
      expect(response.data.access_token).toBe('mock-access-token');
      expect(response.data.refresh_token).toBe('mock-refresh-token');
      expect(response.data.user.username).toBe('testuser');
    });

    it('handles login failure', async () => {
      server.use(
        http.post(`${API_URL}/auth/login`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid credentials',
              },
            },
            { status: 401 }
          );
        })
      );

      await expect(
        authService.login({
          username: 'wronguser',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('completes without error', async () => {
      await expect(authService.logout('mock-refresh-token')).resolves.toBeUndefined();
    });

    it('handles logout without refresh token', async () => {
      await expect(authService.logout()).resolves.toBeUndefined();
    });

    it('swallows errors gracefully', async () => {
      server.use(
        http.post(`${API_URL}/auth/logout`, () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Error' } },
            { status: 500 }
          );
        })
      );

      await expect(authService.logout('token')).resolves.toBeUndefined();
    });
  });

  describe('refresh', () => {
    it('returns new access token', async () => {
      const response = await authService.refresh('mock-refresh-token');

      expect(response.success).toBe(true);
      expect(response.data.access_token).toBe('new-mock-access-token');
      expect(response.data.expires_in).toBe(900);
    });

    it('handles refresh failure', async () => {
      server.use(
        http.post(`${API_URL}/auth/refresh`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid refresh token',
              },
            },
            { status: 401 }
          );
        })
      );

      await expect(authService.refresh('invalid-token')).rejects.toThrow();
    });
  });

  describe('rfidLookup', () => {
    it('returns student data for valid RFID', async () => {
      server.use(
        http.post(`${API_URL}/auth/rfid/lookup`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              student: {
                id: '66666666-6666-6666-6666-666666666666',
                student_id: 'STU-2024-001',
                name: 'Test Student',
                grade_level: 7,
                section: 'A',
                current_loans: 2,
                has_overdue: false,
                total_fines: 0,
                status: 'active',
              },
            },
            message: 'Student found',
          });
        })
      );

      const response = await authService.rfidLookup('RFID-12345');

      expect(response.success).toBe(true);
      expect(response.data.student.student_id).toBe('STU-2024-001');
      expect(response.data.student.name).toBe('Test Student');
    });

    it('handles RFID not found', async () => {
      server.use(
        http.post(`${API_URL}/auth/rfid/lookup`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'No student found with this RFID',
              },
            },
            { status: 404 }
          );
        })
      );

      await expect(authService.rfidLookup('INVALID-RFID')).rejects.toThrow();
    });
  });

  describe('registerRfid', () => {
    it('registers RFID successfully', async () => {
      server.use(
        http.post(`${API_URL}/auth/rfid/register`, () => {
          return HttpResponse.json({
            success: true,
            data: null,
            message: 'RFID registered successfully',
          });
        })
      );

      localStorage.setItem('lms_access_token', 'mock-token');
      const response = await authService.registerRfid('NEW-RFID-CODE');

      expect(response.success).toBe(true);
    });

    it('handles registration failure', async () => {
      server.use(
        http.post(`${API_URL}/auth/rfid/register`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'CONFLICT',
                message: 'RFID already registered',
              },
            },
            { status: 409 }
          );
        })
      );

      localStorage.setItem('lms_access_token', 'mock-token');
      await expect(authService.registerRfid('EXISTING-RFID')).rejects.toThrow();
    });
  });
});
