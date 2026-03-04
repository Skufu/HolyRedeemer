import { describe, it, expect, beforeEach } from 'vitest';
import { studentsService } from './students';
import { server } from '@/test/setup';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:8080/api/v1';

describe('studentsService', () => {
  beforeEach(() => {
    localStorage.setItem('lms_access_token', 'mock-token');
  });

  describe('getMyProfile', () => {
    it('returns current student profile', async () => {
      server.use(
        http.get(`${API_URL}/students/me`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'student-123',
              username: 'student',
              name: 'Test Student',
              studentId: 'STU-001',
              gradeLevel: 7,
              section: 'A',
              status: 'active',
              currentLoans: 2,
              totalFines: 0,
            },
          });
        })
      );

      const response = await studentsService.getMyProfile();
      expect(response.success).toBe(true);
      expect(response.data.name).toBe('Test Student');
      expect(response.data.currentLoans).toBe(2);
    });

    it('handles unauthorized access', async () => {
      server.use(
        http.get(`${API_URL}/students/me`, () => {
          return HttpResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Only students can access this' } },
            { status: 403 }
          );
        })
      );

      await expect(studentsService.getMyProfile()).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('returns paginated list of students', async () => {
      const response = await studentsService.list();

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.meta?.page).toBe(1);
    });

    it('filters by grade level and section', async () => {
      server.use(
        http.get(`${API_URL}/students`, ({ request }) => {
          const url = new URL(request.url);
          const gradeLevel = url.searchParams.get('grade_level');
          const section = url.searchParams.get('section');

          return HttpResponse.json({
            success: true,
            data: [
              { id: '1', name: 'Filtered Student', grade_level: gradeLevel, section },
            ],
            meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
          });
        })
      );

      const response = await studentsService.list({ grade_level: 7, section: 'A' });
      expect(response.data).toHaveLength(1);
    });

    it('searches by name', async () => {
      server.use(
        http.get(`${API_URL}/students`, ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');

          return HttpResponse.json({
            success: true,
            data: search ? [{ id: '1', name: 'John Doe' }] : [],
            meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
          });
        })
      );

      const response = await studentsService.list({ search: 'John' });
      expect(response.data).toHaveLength(1);
      expect(response.data[0].name).toBe('John Doe');
    });
  });

  describe('get', () => {
    it('returns a single student', async () => {
      server.use(
        http.get(`${API_URL}/students/:id`, ({ params }) => {
          return HttpResponse.json({
            success: true,
            data: {
              id: params.id,
              name: 'Test Student',
              student_id: 'STU-001',
              grade_level: 7,
              section: 'A',
              status: 'active',
            },
          });
        })
      );

      const response = await studentsService.get('student-123');
      expect(response.data.name).toBe('Test Student');
    });
  });

  describe('create', () => {
    it('creates a new student', async () => {
      server.use(
        http.post(`${API_URL}/students`, async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { id: 'new-student', ...body },
            message: 'Student created successfully',
          });
        })
      );

      const response = await studentsService.create({
        username: 'newstudent',
        password: 'password123',
        student_id: 'STU-NEW',
        name: 'New Student',
        grade_level: 8,
        section: 'B',
      });

      expect(response.success).toBe(true);
      expect(response.data.name).toBe('New Student');
    });
  });

  describe('update', () => {
    it('updates a student', async () => {
      server.use(
        http.put(`${API_URL}/students/:id`, async ({ params, request }) => {
          const body = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { id: params.id, ...body },
            message: 'Student updated successfully',
          });
        })
      );

      const response = await studentsService.update('student-123', {
        gradeLevel: 8,
        section: 'B',
      });

      expect(response.success).toBe(true);
      expect(response.data.gradeLevel).toBe(8);
    });
  });

  describe('getLoans', () => {
    it('returns student current loans', async () => {
      server.use(
        http.get(`${API_URL}/students/:id/loans`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              {
                id: 'loan-1',
                book_title: 'Test Book',
                due_date: '2025-02-15',
                status: 'borrowed',
              },
            ],
          });
        })
      );

      const response = await studentsService.getLoans('student-123');
      expect(response.data).toHaveLength(1);
      expect(response.data[0].bookTitle).toBe('Test Book');
    });
  });

  describe('getHistory', () => {
    it('returns student borrowing history', async () => {
      server.use(
        http.get(`${API_URL}/students/:id/history`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: 'loan-1', book_title: 'Book 1', status: 'returned' },
              { id: 'loan-2', book_title: 'Book 2', status: 'returned' },
            ],
          });
        })
      );

      const response = await studentsService.getHistory('student-123');
      expect(response.data).toHaveLength(2);
    });
  });

  describe('getFines', () => {
    it('returns student fines', async () => {
      server.use(
        http.get(`${API_URL}/students/:id/fines`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              {
                id: 'fine-1',
                book_title: 'Overdue Book',
                amount: 25.0,
                fine_type: 'overdue',
                status: 'pending',
              },
            ],
          });
        })
      );

      const response = await studentsService.getFines('student-123');
      expect(response.data).toHaveLength(1);
      expect(response.data[0].amount).toBe(25.0);
    });
  });
});
