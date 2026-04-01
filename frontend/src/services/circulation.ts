import { api, ApiResponse } from './api';

export interface CheckoutRequest {
  student_id: string;
  copy_id: string;
  due_date?: string;
  notes?: string;
}

export interface CheckoutResponse {
  transaction_id: string;
  student: { name: string; student_id: string };
  book: { title: string; copy_number: number };
  checkout_date: string;
  due_date: string;
}

export interface ReturnRequest {
  copy_id: string;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
}

export interface ReturnResponse {
  transaction_id: string;
  return_date: string;
  days_overdue: number;
  fine?: { id: string; amount: number; type: string };
  receiptNo?: string;
  incidentType?: string;
  circulationStatus?: string;
}

export interface RenewResponse {
  new_due_date: string;
  renewal_count: number;
}

export interface ActiveLoan {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  copyNumber: number;
  qrCode: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  checkoutDate: string;
  dueDate: string;
  status: string;
  renewCount: number;
  circulationStatus?: string;
}

export interface OverdueLoan extends ActiveLoan {
  daysOverdue: number;
  fineAmount: number;
}

export interface ListLoansParams {
  page?: number;
  per_page?: number;
  student_id?: string;
}

export const circulationService = {
  checkout: async (data: CheckoutRequest): Promise<ApiResponse<CheckoutResponse>> => {
    const response = await api.post<ApiResponse<CheckoutResponse>>('/circulation/checkout', data);
    return response.data;
  },

  return: async (data: ReturnRequest): Promise<ApiResponse<ReturnResponse>> => {
    const response = await api.post<ApiResponse<ReturnResponse>>('/circulation/return', data);
    return response.data;
  },

  renew: async (transactionId: string): Promise<ApiResponse<RenewResponse>> => {
    const response = await api.post<ApiResponse<RenewResponse>>('/circulation/renew', {
      transaction_id: transactionId,
    });
    return response.data;
  },

  listCurrentLoans: async (params?: ListLoansParams): Promise<ApiResponse<ActiveLoan[]>> => {
    const response = await api.get<ApiResponse<ActiveLoan[]>>('/circulation/current', { params });
    return response.data;
  },

  listOverdue: async (params?: { page?: number; per_page?: number }): Promise<ApiResponse<OverdueLoan[]>> => {
    const response = await api.get<ApiResponse<OverdueLoan[]>>('/circulation/overdue', { params });
    return response.data;
  },

  listTransactions: async (params?: ListLoansParams): Promise<ApiResponse<ActiveLoan[]>> => {
    const response = await api.get<ApiResponse<ActiveLoan[]>>('/transactions', { params });
    return response.data;
  },
  notifyOverdue: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>(`/circulation/${id}/notify`);
    return response.data;
  },
};
