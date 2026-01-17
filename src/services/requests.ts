import { api, ApiResponse } from './api';

export interface BookRequest {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  requestType: 'reservation' | 'request';
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  notes?: string;
  requestDate: string;
  processedAt?: string;
}

export interface CreateRequestInput {
  book_id: string;
  request_type: 'reservation' | 'request';
  notes?: string;
}

export interface ListRequestsParams {
  page?: number;
  per_page?: number;
  status?: string;
  student_id?: string;
}

export const requestsService = {
  list: async (params?: ListRequestsParams): Promise<ApiResponse<BookRequest[]>> => {
    const response = await api.get<ApiResponse<BookRequest[]>>('/requests', { params });
    return response.data;
  },

  create: async (data: CreateRequestInput): Promise<ApiResponse<{ id: string }>> => {
    const response = await api.post<ApiResponse<{ id: string }>>('/requests', data);
    return response.data;
  },

  getPendingCount: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await api.get<ApiResponse<{ count: number }>>('/requests/pending-count');
    return response.data;
  },

  approve: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.put<ApiResponse<null>>(`/requests/${id}/approve`);
    return response.data;
  },

  reject: async (id: string, notes?: string): Promise<ApiResponse<null>> => {
    const response = await api.put<ApiResponse<null>>(`/requests/${id}/reject`, { notes });
    return response.data;
  },
};
