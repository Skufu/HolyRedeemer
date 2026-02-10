import { describe, it, expect, beforeEach } from 'vitest';
import { finesService } from './fines';
import { server } from '@/test/setup';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3847/api/v1';

describe('finesService', () => {
  beforeEach(() => {
    localStorage.setItem('lms_access_token', 'mock-token');
  });

  describe('list', () => {
    it('returns paginated list of fines', async () => {
      const response = await finesService.list();

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].fine_type).toBe('overdue');
    });

    it('filters by student and status', async () => {
      server.use(
        http.get(`${API_URL}/fines`, ({ request }) => {
          const url = new URL(request.url);
          const studentId = url.searchParams.get('student_id');
          const status = url.searchParams.get('status');

          return HttpResponse.json({
            success: true,
            data: studentId && status ? [{ id: '1', student_id: studentId, status }] : [],
            meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
          });
        })
      );

      const response = await finesService.list({ student_id: 'student-123', status: 'pending' });
      expect(response.data).toHaveLength(1);
      expect(response.data[0].status).toBe('pending');
    });
  });

  describe('get', () => {
    it('returns a single fine with details', async () => {
      server.use(
        http.get(`${API_URL}/fines/:id`, ({ params }) => {
          return HttpResponse.json({
            success: true,
            data: {
              id: params.id,
              amount: 25.0,
              status: 'pending',
              student_name: 'Test Student',
              book_title: 'Test Book',
              fine_type: 'overdue',
            },
          });
        })
      );

      const response = await finesService.get('fine-123');
      expect(response.success).toBe(true);
      expect(response.data.amount).toBe(25.0);
      expect(response.data.student_name).toBe('Test Student');
    });

    it('handles fine not found', async () => {
      server.use(
        http.get(`${API_URL}/fines/:id`, () => {
          return HttpResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'Fine not found' } },
            { status: 404 }
          );
        })
      );

      await expect(finesService.get('nonexistent')).rejects.toThrow();
    });
  });

  describe('pay', () => {
    it('processes a payment', async () => {
      server.use(
        http.post(`${API_URL}/fines/:id/pay`, async ({ params, request }) => {
          const body = await request.json() as { amount: number };
          return HttpResponse.json({
            success: true,
            data: {
              payment_id: 'payment-123',
              amount: body.amount,
              total_paid: body.amount,
              remaining: 0,
            },
            message: 'Payment recorded successfully',
          });
        })
      );

      const response = await finesService.pay('fine-123', {
        amount: 25.0,
        payment_method: 'cash',
      });

      expect(response.success).toBe(true);
    });

    it('handles partial payment', async () => {
      server.use(
        http.post(`${API_URL}/fines/:id/pay`, async ({ request }) => {
          const body = await request.json() as { amount: number };
          return HttpResponse.json({
            success: true,
            data: {
              payment_id: 'payment-123',
              amount: body.amount,
              total_paid: body.amount,
              remaining: 15.0,
            },
          });
        })
      );

      const response = await finesService.pay('fine-123', {
        amount: 10.0,
        payment_method: 'gcash',
        reference_number: 'GCASH-12345',
      });

      expect(response.success).toBe(true);
    });

    it('handles already paid fine', async () => {
      server.use(
        http.post(`${API_URL}/fines/:id/pay`, () => {
          return HttpResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'Fine is already paid' } },
            { status: 400 }
          );
        })
      );

      await expect(
        finesService.pay('fine-123', { amount: 25.0, payment_method: 'cash' })
      ).rejects.toThrow();
    });
  });

  describe('waive', () => {
    it('waives a fine', async () => {
      server.use(
        http.post(`${API_URL}/fines/:id/waive`, () => {
          return HttpResponse.json({
            success: true,
            data: { id: 'fine-123', status: 'waived' },
            message: 'Fine waived successfully',
          });
        })
      );

      const response = await finesService.waive('fine-123', 'First offense');
      expect(response.success).toBe(true);
      expect(response.data.status).toBe('waived');
    });

    it('handles cannot waive paid fine', async () => {
      server.use(
        http.post(`${API_URL}/fines/:id/waive`, () => {
          return HttpResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'Cannot waive a paid fine' } },
            { status: 400 }
          );
        })
      );

      await expect(finesService.waive('fine-123')).rejects.toThrow();
    });
  });
});
