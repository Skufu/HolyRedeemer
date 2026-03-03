import { api, ApiResponse } from './api';

export interface Fine {
  id: string;
  transaction_id: string;
  student_id: string;
  student_name?: string;
  book_title?: string;
  amount: number;
  fine_type: 'overdue' | 'lost' | 'damaged' | 'other';
  description?: string;
  status: 'pending' | 'partial' | 'paid' | 'waived';
  created_at: string;
}

export interface Payment {
  id: string;
  fine_id: string;
  amount: number;
  total_paid: number;
  remaining: number;
  payment_method?: 'cash' | 'gcash' | 'bank_transfer' | 'other';
  reference_number?: string;
  notes?: string;
  payment_date?: string;
  processed_by?: string;
}

export interface PaymentRequest {
  amount: number;
  payment_method: 'cash' | 'gcash' | 'bank_transfer' | 'other';
  reference_number?: string;
  notes?: string;
}

export interface ListFinesParams {
  page?: number;
  per_page?: number;
  student_id?: string;
  status?: string;
}

export const finesService = {
  list: async (params?: ListFinesParams): Promise<ApiResponse<Fine[]>> => {
    const response = await api.get<ApiResponse<Fine[]>>('/fines', { params });
    if (!response.data.data) {
      return response.data;
    }

    return {
      ...response.data,
      data: response.data.data.map((fine) => ({
        ...fine,
        fine_type: fine.fine_type ?? (fine as Fine & { type?: Fine['fine_type'] }).type,
        student_name: fine.student_name ?? (fine as Fine & { studentName?: string }).studentName,
        book_title: fine.book_title ?? (fine as Fine & { bookTitle?: string }).bookTitle,
      })),
    };
  },

  get: async (id: string): Promise<ApiResponse<Fine>> => {
    const response = await api.get<ApiResponse<Fine>>(`/fines/${id}`);
    return response.data;
  },

  pay: async (id: string, payment: PaymentRequest): Promise<ApiResponse<Payment>> => {
    const response = await api.post<ApiResponse<Payment>>(`/fines/${id}/pay`, payment);
    return response.data;
  },

  waive: async (id: string, reason?: string): Promise<ApiResponse<Fine>> => {
    const response = await api.post<ApiResponse<Fine>>(`/fines/${id}/waive`, { reason });
    return response.data;
  },
};
