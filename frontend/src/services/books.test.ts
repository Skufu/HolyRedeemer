import { describe, it, expect, beforeEach } from 'vitest';
import { booksService } from './books';
import { server } from '@/test/setup';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:8080/api/v1';

describe('booksService', () => {
  beforeEach(() => {
    localStorage.setItem('lms_access_token', 'mock-token');
  });

  describe('list', () => {
    it('returns paginated list of books', async () => {
      const response = await booksService.list();

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].title).toBe('Test Book');
      expect(response.meta?.page).toBe(1);
    });

    it('passes query parameters', async () => {
      server.use(
        http.get(`${API_URL}/books`, ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');
          const page = url.searchParams.get('page');

          return HttpResponse.json({
            success: true,
            data: search === 'Harry' ? [{ id: '1', title: 'Harry Potter' }] : [],
            meta: { page: parseInt(page || '1'), per_page: 20, total: 1, total_pages: 1 },
          });
        })
      );

      const response = await booksService.list({ search: 'Harry', page: 2 });
      expect(response.data).toHaveLength(1);
      expect(response.data[0].title).toBe('Harry Potter');
    });
  });

  describe('get', () => {
    it('returns a single book', async () => {
      server.use(
        http.get(`${API_URL}/books/:id`, ({ params }) => {
          return HttpResponse.json({
            success: true,
            data: {
              id: params.id,
              title: 'Test Book',
              author: 'Test Author',
              totalCopies: 5,
              availableCopies: 3,
              status: 'active',
            },
          });
        })
      );

      const response = await booksService.get('44444444-4444-4444-4444-444444444444');
      expect(response.success).toBe(true);
      expect(response.data.title).toBe('Test Book');
    });

    it('handles not found error', async () => {
      server.use(
        http.get(`${API_URL}/books/:id`, () => {
          return HttpResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'Book not found' } },
            { status: 404 }
          );
        })
      );

      await expect(booksService.get('nonexistent')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('creates a new book', async () => {
      server.use(
        http.post(`${API_URL}/books`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: { id: 'new-book-id', ...body },
            message: 'Book created successfully',
          });
        })
      );

      const response = await booksService.create({
        title: 'New Book',
        author: 'New Author',
        initial_copies: 3,
      });

      expect(response.success).toBe(true);
      expect(response.data.title).toBe('New Book');
    });
  });

  describe('update', () => {
    it('updates an existing book', async () => {
      server.use(
        http.put(`${API_URL}/books/:id`, async ({ params, request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: { id: params.id, ...body },
            message: 'Book updated successfully',
          });
        })
      );

      const response = await booksService.update('book-id', { title: 'Updated Title' });
      expect(response.success).toBe(true);
      expect(response.data.title).toBe('Updated Title');
    });
  });

  describe('delete', () => {
    it('deletes a book', async () => {
      server.use(
        http.delete(`${API_URL}/books/:id`, () => {
          return HttpResponse.json({ success: true, message: 'Book archived' });
        })
      );

      await expect(booksService.delete('book-id')).resolves.toBeUndefined();
    });
  });

  describe('listCopies', () => {
    it('returns copies for a book', async () => {
      server.use(
        http.get(`${API_URL}/books/:bookId/copies`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: 'copy-1', copy_number: 1, qr_code: 'HR-001', status: 'available' },
              { id: 'copy-2', copy_number: 2, qr_code: 'HR-002', status: 'borrowed' },
            ],
          });
        })
      );

      const response = await booksService.listCopies('book-id');
      expect(response.data).toHaveLength(2);
      expect(response.data[0].status).toBe('available');
    });
  });

  describe('createCopy', () => {
    it('creates a new copy', async () => {
      server.use(
        http.post(`${API_URL}/books/:bookId/copies`, () => {
          return HttpResponse.json({
            success: true,
            data: { id: 'new-copy', copy_number: 3, qr_code: 'HR-003', status: 'available' },
            message: 'Copy created successfully',
          });
        })
      );

      const response = await booksService.createCopy('book-id', { condition: 'good' });
      expect(response.success).toBe(true);
      expect(response.data.qr_code).toBe('HR-003');
    });
  });

  describe('getCopyByQR', () => {
    it('returns copy by QR code', async () => {
      server.use(
        http.get(`${API_URL}/copies/:qrCode`, ({ params }) => {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'copy-id',
              qr_code: params.qrCode,
              status: 'available',
              book: { id: 'book-id', title: 'Test Book' },
            },
          });
        })
      );

      const response = await booksService.getCopyByQR('HR-001');
      expect(response.data.qr_code).toBe('HR-001');
      expect(response.data.book.title).toBe('Test Book');
    });
  });

  describe('listCategories', () => {
    it('returns list of categories', async () => {
      server.use(
        http.get(`${API_URL}/categories`, () => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: '1', name: 'Fiction', color_code: '#FF5733' },
              { id: '2', name: 'Non-Fiction', color_code: '#33FF57' },
            ],
          });
        })
      );

      const response = await booksService.listCategories();
      expect(response.data).toHaveLength(2);
      expect(response.data[0].name).toBe('Fiction');
    });
  });

  describe('createCategory', () => {
    it('creates a new category', async () => {
      server.use(
        http.post(`${API_URL}/categories`, async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json({
            success: true,
            data: { id: 'new-cat-id', ...body },
            message: 'Category created successfully',
          });
        })
      );

      const response = await booksService.createCategory({
        name: 'Science Fiction',
        color_code: '#0000FF',
      });

      expect(response.data.name).toBe('Science Fiction');
    });
  });
});
