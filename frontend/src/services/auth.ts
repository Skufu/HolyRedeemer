import { api, ApiResponse } from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UserData {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: 'super_admin' | 'admin' | 'librarian' | 'student';
  createdAt: string;
}

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserData;
}

export interface RefreshResponseData {
  access_token: string;
  expires_in: number;
}

export interface StudentLookup {
  id: string;
  student_id: string;
  name: string;
  grade_level: number;
  section: string;
  current_loans: number;
  has_overdue: boolean;
  total_fines: number;
  status: string;
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<ApiResponse<LoginResponseData>> => {
    const response = await api.post<ApiResponse<LoginResponseData>>('/auth/login', credentials);
    return response.data;
  },

  logout: async (refreshToken?: string): Promise<void> => {
    await api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {});
  },

  refresh: async (refreshToken: string): Promise<ApiResponse<RefreshResponseData>> => {
    const response = await api.post<ApiResponse<RefreshResponseData>>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  rfidLookup: async (rfidCode: string): Promise<ApiResponse<{ student: StudentLookup }>> => {
    const response = await api.post<ApiResponse<{ student: StudentLookup }>>('/auth/rfid/lookup', {
      rfid_code: rfidCode,
    });
    return response.data;
  },

  registerRfid: async (rfidCode: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>('/auth/rfid/register', {
      rfid_code: rfidCode,
    });
    return response.data;
  },
};
