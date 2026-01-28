import { api, ApiResponse } from './api';

export interface StudentProfile {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: string;
  studentId: string;
  gradeLevel: number;
  section: string;
  rfid?: string;
  guardianName?: string;
  guardianContact?: string;
  status: string;
  currentLoans: number;
  totalFines: number;
  createdAt: string;
}

export interface Student {
  id: string;
  userId: string;
  student_id: string;
  username: string;
  name: string;
  email?: string;
  gradeLevel: number;
  section: string;
  rfid?: string;
  guardian_name?: string;
  guardian_contact?: string;
  contact_info?: string;
  status: 'active' | 'inactive' | 'graduated' | 'suspended';
  current_loans: number;
  total_fines: number;
}

export interface StudentLoan {
  id: string;
  bookId: string;
  bookCopyId: string;
  bookTitle: string;
  bookAuthor: string;
  copyNumber: number;
  qrCode: string;
  checkoutDate: string;
  dueDate: string;
  returnDate?: string;
  status: string;
  renewCount: number;
  fineAmount: number;
  bookIsbn?: string;
}

export interface StudentRequest {
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

export interface StudentFine {
  id: string;
  studentId: string;
  studentName?: string;
  studentNumber?: string;
  transactionId?: string;
  bookTitle?: string;
  amount: number;
  fineType: string;
  description?: string;
  reason?: string;
  status: string;
  createdAt: string;
}

export interface ListStudentsParams {
  page?: number;
  per_page?: number;
  search?: string;
  grade_level?: number;
  section?: string;
  status?: string;
}

export interface CreateStudentRequest {
  username: string;
  password: string;
  student_id: string;
  name: string;
  email?: string;
  grade_level: number;
  section: string;
  contact_info?: string;
  guardian_name?: string;
  guardian_contact?: string;
}

export const studentsService = {
  getMyProfile: async (): Promise<ApiResponse<StudentProfile>> => {
    const response = await api.get<ApiResponse<StudentProfile>>('/students/me');
    return response.data;
  },

  list: async (params?: ListStudentsParams): Promise<ApiResponse<Student[]>> => {
    const response = await api.get<ApiResponse<Student[]>>('/students', { params });
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<Student>> => {
    const response = await api.get<ApiResponse<Student>>(`/students/${id}`);
    return response.data;
  },

  create: async (student: CreateStudentRequest): Promise<ApiResponse<Student>> => {
    const response = await api.post<ApiResponse<Student>>('/students', student);
    return response.data;
  },

  update: async (id: string, student: Partial<Student>): Promise<ApiResponse<Student>> => {
    const response = await api.put<ApiResponse<Student>>(`/students/${id}`, student);
    return response.data;
  },

  getLoans: async (id: string): Promise<ApiResponse<StudentLoan[]>> => {
    const response = await api.get<ApiResponse<StudentLoan[]>>(`/students/${id}/loans`);
    return response.data;
  },

  getHistory: async (id: string, params?: { page?: number; per_page?: number }): Promise<ApiResponse<StudentLoan[]>> => {
    const response = await api.get<ApiResponse<StudentLoan[]>>(`/students/${id}/history`, { params });
    return response.data;
  },

  getFines: async (id: string): Promise<ApiResponse<StudentFine[]>> => {
    const response = await api.get<ApiResponse<StudentFine[]>>(`/students/${id}/fines`);
    return response.data;
  },

  getRequests: async (
    id: string,
    params?: { page?: number; per_page?: number; status?: string; request_type?: 'reservation' | 'request' }
  ): Promise<ApiResponse<StudentRequest[]>> => {
    const response = await api.get<ApiResponse<StudentRequest[]>>(`/students/${id}/requests`, { params });
    return response.data;
  },

  reserveBook: async (bookId: string, notes?: string): Promise<ApiResponse<{ id: string }>> => {
    const response = await api.post<ApiResponse<{ id: string }>>('/students/reserve', {
      book_id: bookId,
      notes: notes || undefined,
    });
    return response.data;
  },
};
