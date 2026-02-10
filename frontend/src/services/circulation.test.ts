import { describe, it, expect, beforeEach } from 'vitest';
import { circulationService } from './circulation';
import { server } from '@/test/setup';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:8080/api/v1';

describe('circulationService', () => {
  beforeEach(() => {
    localStorage.setItem('lms_access_token', 'mock-token');
  });

  describe('checkout', () => {
    it('processes a book checkout', async () => {
      server.use(
        http.post(`${API_URL}/circulation/checkout`, async ({ request }) => {
          const body = await request.json() as { student_id: string; copy_id: string };
          return HttpResponse.json({
            success: true,
            data: {
              transaction_id: 'txn-123',
              student: { name: 'Test Student', student_id: 'STU-001' },
              book: { title: 'Test Book', copy_number: 1 },
              checkout_date: new Date().toISOString(),
              due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            },
            message: 'Book checked out successfully',
          });
        })
      );

      const response = await circulationService.checkout({
        student_id: 'student-id',
        copy_id: 'copy-id',
      });

      expect(response.success).toBe(true);
      expect(response.data.transaction_id).toBe('txn-123');
      expect(response.data.student.name).toBe('Test Student');
    });

    it('handles checkout with custom due date', async () => {
      const customDueDate = '2025-02-15';
      server.use(
        http.post(`${API_URL}/circulation/checkout`, async ({ request }) => {
          const body = await request.json() as { due_date?: string };
          return HttpResponse.json({
            success: true,
            data: {
              transaction_id: 'txn-123',
              student: { name: 'Test Student', student_id: 'STU-001' },
              book: { title: 'Test Book', copy_number: 1 },
              checkout_date: new Date().toISOString(),
              due_date: body.due_date,
            },
          });
        })
      );

      const response = await circulationService.checkout({
        student_id: 'student-id',
        copy_id: 'copy-id',
        due_date: customDueDate,
      });

      expect(response.data.due_date).toBe(customDueDate);
    });

    it('handles checkout failure', async () => {
      server.use(
        http.post(`${API_URL}/circulation/checkout`, () => {
          return HttpResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'Book copy not available' } },
            { status: 400 }
          );
        })
      );

      await expect(
        circulationService.checkout({ student_id: 'student', copy_id: 'unavailable-copy' })
      ).rejects.toThrow();
    });
  });

  describe('return', () => {
    it('processes a book return', async () => {
      server.use(
        http.post(`${API_URL}/circulation/return`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              transaction_id: 'txn-123',
              return_date: new Date().toISOString(),
              days_overdue: 0,
            },
            message: 'Book returned successfully',
          });
        })
      );

      const response = await circulationService.return({ copy_id: 'copy-id' });

      expect(response.success).toBe(true);
      expect(response.data.days_overdue).toBe(0);
      expect(response.data.fine).toBeUndefined();
    });

    it('returns with overdue fine', async () => {
      server.use(
        http.post(`${API_URL}/circulation/return`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              transaction_id: 'txn-123',
              return_date: new Date().toISOString(),
              days_overdue: 5,
              fine: { id: 'fine-id', amount: 25, type: 'overdue' },
            },
          });
        })
      );

      const response = await circulationService.return({ copy_id: 'copy-id' });

      expect(response.data.days_overdue).toBe(5);
      expect(response.data.fine).toBeDefined();
      expect(response.data.fine?.amount).toBe(25);
    });

    it('returns with condition update', async () => {
      server.use(
        http.post(`${API_URL}/circulation/return`, async ({ request }) => {
          const body = await request.json() as { condition?: string };
          return HttpResponse.json({
            success: true,
            data: {
              transaction_id: 'txn-123',
              return_date: new Date().toISOString(),
              days_overdue: 0,
            },
          });
        })
      );

      const response = await circulationService.return({
        copy_id: 'copy-id',
        condition: 'fair',
        notes: 'Some wear and tear',
      });

      expect(response.success).toBe(true);
    });
  });

  describe('renew', () => {
    it('renews a loan', async () => {
      server.use(
        http.post(`${API_URL}/circulation/renew`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              new_due_date: '2025-02-15',
              renewal_count: 1,
            },
            message: 'Loan renewed successfully',
          });
        })
      );

      const response = await circulationService.renew('txn-123');

      expect(response.success).toBe(true);
      expect(response.data.renewal_count).toBe(1);
    });

    it('handles max renewals reached', async () => {
      server.use(
        http.post(`${API_URL}/circulation/renew`, () => {
          return HttpResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'Maximum renewal limit reached' } },
            { status: 400 }
          );
        })
      );

      await expect(circulationService.renew('txn-123')).rejects.toThrow();
    });
  });

  describe('listCurrentLoans', () => {
    it('returns current loans', async () => {
      const response = await circulationService.listCurrentLoans();

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].status).toBe('borrowed');
    });

    it('filters by student', async () => {
      server.use(
        http.get(`${API_URL}/circulation/current`, ({ request }) => {
          const url = new URL(request.url);
          const studentId = url.searchParams.get('student_id');

          return HttpResponse.json({
            success: true,
            data: studentId
              ? [{ id: '1', studentId, studentName: 'Filtered Student' }]
              : [{ id: '1' }, { id: '2' }],
            meta: { page: 1, per_page: 50, total: 1, total_pages: 1 },
          });
        })
      );

      const response = await circulationService.listCurrentLoans({ student_id: 'student-123' });
      expect(response.data).toHaveLength(1);
    });
  });

  describe('listOverdue', () => {
    it('returns overdue loans', async () => {
      server.use(
        http.get(`${API_URL}/circulation/overdue`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              {
                id: 'loan-1',
                bookTitle: 'Overdue Book',
                daysOverdue: 5,
                fineAmount: 25,
              },
            ],
            meta: { page: 1, per_page: 50, total: 1, total_pages: 1 },
          });
        })
      );

      const response = await circulationService.listOverdue();

      expect(response.data).toHaveLength(1);
      expect(response.data[0].daysOverdue).toBe(5);
      expect(response.data[0].fineAmount).toBe(25);
    });
  });

  describe('listTransactions', () => {
    it('returns transaction history', async () => {
      server.use(
        http.get(`${API_URL}/transactions`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: 'txn-1', status: 'returned' },
              { id: 'txn-2', status: 'borrowed' },
            ],
            meta: { page: 1, per_page: 20, total: 2, total_pages: 1 },
          });
        })
      );

      const response = await circulationService.listTransactions();

      expect(response.data).toHaveLength(2);
    });
  });
});
