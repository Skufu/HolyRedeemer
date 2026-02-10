import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { HttpResponse, http } from 'msw';

const API_URL = 'http://localhost:8080/api/v1';

export const handlers = [
  http.post(`${API_URL}/auth/login`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 900,
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          username: 'testuser',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin',
          createdAt: new Date().toISOString(),
        },
      },
      message: 'Login successful',
    });
  }),

  http.post(`${API_URL}/auth/logout`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  }),

  http.post(`${API_URL}/auth/refresh`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        access_token: 'new-mock-access-token',
        expires_in: 900,
      },
    });
  }),

  http.get(`${API_URL}/books`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '44444444-4444-4444-4444-444444444444',
          title: 'Test Book',
          author: 'Test Author',
          isbn: '978-0-123456-78-9',
          category: 'Fiction',
          totalCopies: 5,
          availableCopies: 3,
          status: 'active',
        },
      ],
      meta: {
        page: 1,
        per_page: 20,
        total: 1,
        total_pages: 1,
      },
    });
  }),

  http.get(`${API_URL}/students`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '66666666-6666-6666-6666-666666666666',
          studentId: 'STU-2024-001',
          name: 'Test Student',
          gradeLevel: 7,
          section: 'A',
          status: 'active',
          currentLoans: 2,
          totalFines: 0,
        },
      ],
      meta: {
        page: 1,
        per_page: 20,
        total: 1,
        total_pages: 1,
      },
    });
  }),

  http.get(`${API_URL}/reports/dashboard`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalBooks: 100,
        totalCopies: 250,
        activeStudents: 500,
        currentLoans: 75,
        overdueBooks: 5,
        totalFines: 150.0,
        checkoutsToday: 10,
        returnsToday: 8,
        dueToday: 3,
      },
    });
  }),

  http.get(`${API_URL}/circulation/current`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '88888888-8888-8888-8888-888888888888',
          bookTitle: 'Test Book',
          studentName: 'Test Student',
          checkoutDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'borrowed',
        },
      ],
      meta: {
        page: 1,
        per_page: 50,
        total: 1,
        total_pages: 1,
      },
    });
  }),

  http.get(`${API_URL}/fines`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '99999999-9999-9999-9999-999999999999',
          studentName: 'Test Student',
          amount: 25.0,
          type: 'overdue',
          status: 'pending',
        },
      ],
      meta: {
        page: 1,
        per_page: 20,
        total: 1,
        total_pages: 1,
      },
    });
  }),
];

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
