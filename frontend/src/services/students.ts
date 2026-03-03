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

export interface FavoriteBook {
  id: string;
  bookId: string;
  title: string;
  author: string;
  isbn?: string;
  coverImage?: string;
  addedAt: string;
}

export interface Achievement {
	id: string;
	code: string;
	name: string;
	description: string;
  icon: string;
  color: string;
  requirementType: string;
  requirementValue: number;
  unlockedAt?: string;
	isUnlocked: boolean;
}

export interface StudentDashboard {
	profile: StudentProfile;
	loans: StudentLoan[];
	fines: StudentFine[];
	history: StudentLoan[];
	unreadCount: number;
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

	getMyDashboard: async (params?: {
		loans_per_page?: number;
		fines_per_page?: number;
		history_per_page?: number;
	}): Promise<ApiResponse<StudentDashboard>> => {
		const response = await api.get<ApiResponse<StudentDashboard>>('/students/me/dashboard', { params });
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
    if (!response.data.data) {
      return response.data;
    }

    return {
      ...response.data,
      data: response.data.data.map((loan) => ({
        ...loan,
        bookTitle: loan.bookTitle ?? (loan as StudentLoan & { book_title?: string }).book_title ?? '',
        bookAuthor: loan.bookAuthor ?? (loan as StudentLoan & { book_author?: string }).book_author ?? '',
        bookId: loan.bookId ?? (loan as StudentLoan & { book_id?: string }).book_id ?? '',
        bookCopyId: loan.bookCopyId ?? (loan as StudentLoan & { book_copy_id?: string }).book_copy_id ?? '',
        copyNumber: loan.copyNumber ?? (loan as StudentLoan & { copy_number?: number }).copy_number ?? 0,
        qrCode: loan.qrCode ?? (loan as StudentLoan & { qr_code?: string }).qr_code ?? '',
        checkoutDate: loan.checkoutDate ?? (loan as StudentLoan & { checkout_date?: string }).checkout_date ?? '',
        dueDate: loan.dueDate ?? (loan as StudentLoan & { due_date?: string }).due_date ?? '',
        returnDate: loan.returnDate ?? (loan as StudentLoan & { return_date?: string }).return_date,
        renewCount: loan.renewCount ?? (loan as StudentLoan & { renew_count?: number }).renew_count ?? 0,
      })),
    };
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

  getFavorites: async (): Promise<ApiResponse<FavoriteBook[]>> => {
    const response = await api.get<ApiResponse<FavoriteBook[]>>('/students/me/favorites');
    return response.data;
  },

  addFavorite: async (bookId: string): Promise<ApiResponse<FavoriteBook>> => {
    const response = await api.post<ApiResponse<FavoriteBook>>('/students/me/favorites', {
      book_id: bookId,
    });
    return response.data;
  },

  removeFavorite: async (bookId: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/students/me/favorites/${bookId}`);
    return response.data;
  },

  getMyAchievements: async (): Promise<ApiResponse<Achievement[]>> => {
    const response = await api.get<ApiResponse<Achievement[]>>('/students/me/achievements');
    return response.data;
  },

  getAllAchievements: async (): Promise<ApiResponse<Achievement[]>> => {
    const response = await api.get<ApiResponse<Achievement[]>>('/students/achievements');
    return response.data;
  },
};
