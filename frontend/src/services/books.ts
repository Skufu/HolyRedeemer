import { api, ApiResponse } from './api';

import { Book, BookCopy, Category } from '@/services/books';

export interface Category {
  id: string;
  name: string;
  color_code?: string;
  book_count?: number;
}

export interface Book {
  id: string;
  isbn?: string;
  title: string;
  author: string;
  category: string;
  categoryId?: string;
  categoryColor?: string;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  coverImage?: string;
  shelfLocation?: string;
  replacementCost?: number;
  totalCopies: number;
  availableCopies: number;
  status: string;
}
export type BookCopy = {
  id: string;
  bookId: string;
  copyNumber: number;
  qrCode: string;
  status: string;
  condition: string;
  borrowerName?: string;
  borrowerStudentNumber?: string;
  checkoutDate?: string;
  dueDate?: string;
  borrowerId?: string;

  borrowerName?: string;              // ✅ NEW
  borrowerStudentNumber?: string;     // ✅ NEW
  checkoutDate?: string;              // ✅ optional but useful
};

export interface BookCopy {
  id: string;
  bookId: string;
  bookTitle?: string;
  copyNumber: number;
  qrCode: string;
  status: 'available' | 'borrowed' | 'damaged' | 'lost' | 'reserved';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
}

type BookCopyResponse = BookCopy & {
  book_id?: string;
  book_title?: string;
  copy_number?: number;
  qr_code?: string;
};

export interface ListBooksParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: string;
  status?: string;
  available_only?: boolean;
}

export interface CreateBookRequest {
  isbn?: string;
  title: string;
  author: string;
  category_id?: string;
  publisher?: string;
  publication_year?: number;
  description?: string;
  cover_url?: string;
  shelf_location?: string;
  replacement_cost?: number;
  initial_copies?: number;
}

export const booksService = {
  list: async (params?: ListBooksParams): Promise<ApiResponse<Book[]>> => {
    const response = await api.get<ApiResponse<Book[]>>('/books', { params });
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<Book>> => {
    const response = await api.get<ApiResponse<Book>>(`/books/${id}`);
    return response.data;
  },

  create: async (book: CreateBookRequest): Promise<ApiResponse<Book>> => {
    const response = await api.post<ApiResponse<Book>>('/books', book);
    return response.data;
  },

  update: async (id: string, book: Partial<CreateBookRequest>): Promise<ApiResponse<Book>> => {
    const response = await api.put<ApiResponse<Book>>(`/books/${id}`, book);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/books/${id}`);
  },

  listCopies: async (bookId: string): Promise<ApiResponse<BookCopy[]>> => {
    const response = await api.get<ApiResponse<BookCopyResponse[]>>(`/books/${bookId}/copies`);
    if (!response.data.data) {
      return response.data as ApiResponse<BookCopy[]>;
    }

    return {
      ...response.data,
      data: response.data.data.map((copy) => ({
        id: copy.id,
        bookId: copy.bookId ?? copy.book_id ?? '',
        bookTitle: copy.bookTitle ?? copy.book_title,
        copyNumber: copy.copyNumber ?? copy.copy_number ?? 0,
        qrCode: copy.qrCode ?? copy.qr_code ?? '',
        status: copy.status,
        condition: copy.condition,
        notes: copy.notes,
      })),
    };
  },

  createCopy: async (bookId: string, data: Partial<BookCopy>): Promise<ApiResponse<BookCopy>> => {
    const response = await api.post<ApiResponse<BookCopyResponse>>(`/books/${bookId}/copies`, data);
    if (!response.data.data) {
      return response.data as ApiResponse<BookCopy>;
    }

    const copy = response.data.data;
    return {
      ...response.data,
      data: {
        id: copy.id,
        bookId: copy.bookId ?? copy.book_id ?? bookId,
        bookTitle: copy.bookTitle ?? copy.book_title,
        copyNumber: copy.copyNumber ?? copy.copy_number ?? 0,
        qrCode: copy.qrCode ?? copy.qr_code ?? '',
        status: copy.status ?? 'available',
        condition: copy.condition ?? 'good',
        notes: copy.notes,
      },
    };
  },

  getCopyByQR: async (qrCode: string): Promise<ApiResponse<BookCopy & { book: Book; current_loan?: unknown }>> => {
    const response = await api.get<ApiResponse<BookCopyResponse & { book: Book; current_loan?: unknown }>>(`/copies/${qrCode}`);
    if (!response.data.data) {
      return response.data as ApiResponse<BookCopy & { book: Book; current_loan?: unknown }>;
    }

    const copy = response.data.data;
    return {
      ...response.data,
      data: {
        ...copy,
        bookId: copy.bookId ?? copy.book_id ?? '',
        bookTitle: copy.bookTitle ?? copy.book_title,
        copyNumber: copy.copyNumber ?? copy.copy_number ?? 0,
        qrCode: copy.qrCode ?? copy.qr_code ?? '',
      },
    };
  },

  listCategories: async (): Promise<ApiResponse<Category[]>> => {
    const response = await api.get<ApiResponse<Category[]>>('/categories');
    return response.data;
  },

  createCategory: async (data: { name: string; color_code?: string }): Promise<ApiResponse<Category>> => {
    const response = await api.post<ApiResponse<Category>>('/categories', data);
    return response.data;
  },

  regenerateQRCode: async (qrCode: string): Promise<ApiResponse<{ id: string; qr_code: string }>> => {
    const response = await api.post<ApiResponse<{ id: string; qr_code: string }>>(`/copies/${qrCode}/regenerate`);
    return response.data;
  },

  bulkRegenerateQRCodes: async (bookId: string): Promise<ApiResponse<{ message: string; count: number }>> => {
    const response = await api.post<ApiResponse<{ message: string; count: number }>>(`/books/${bookId}/copies/bulk-regenerate`);
    return response.data;
  },
};
