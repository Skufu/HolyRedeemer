import { api, ApiResponse } from './api';

export interface Librarian {
  id: string;
  userId: string;
  username: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  status?: string;
  createdAt: string;
}

export interface Admin {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin';
  status: string;
  createdAt: string;
}

export interface ListLibrariansParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface ListAdminsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
}

export interface CreateLibrarianRequest {
  username: string;
  password: string;
  employee_id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
}

export interface UpdateLibrarianRequest {
  employee_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  status?: string;
}

export interface CreateAdminRequest {
  username: string;
  password: string;
  name: string;
  email?: string;
  role?: 'admin' | 'super_admin';
}

export interface UpdateAdminRequest {
  name?: string;
  email?: string;
  status?: string;
}

export const usersService = {
  listLibrarians: async (params?: ListLibrariansParams): Promise<ApiResponse<Librarian[]>> => {
    const response = await api.get<ApiResponse<Librarian[]>>('/librarians', { params });
    return response.data;
  },

  getLibrarian: async (id: string): Promise<ApiResponse<Librarian>> => {
    const response = await api.get<ApiResponse<Librarian>>(`/librarians/${id}`);
    return response.data;
  },

  createLibrarian: async (data: CreateLibrarianRequest): Promise<ApiResponse<Librarian>> => {
    const response = await api.post<ApiResponse<Librarian>>('/librarians', data);
    return response.data;
  },

  updateLibrarian: async (id: string, data: UpdateLibrarianRequest): Promise<ApiResponse<Librarian>> => {
    const response = await api.put<ApiResponse<Librarian>>(`/librarians/${id}`, data);
    return response.data;
  },

  deleteLibrarian: async (id: string): Promise<ApiResponse<void>> => {
    const response = await api.delete<ApiResponse<void>>(`/librarians/${id}`);
    return response.data;
  },

  listAdmins: async (params?: ListAdminsParams): Promise<ApiResponse<Admin[]>> => {
    const response = await api.get<ApiResponse<Admin[]>>('/admins', { params });
    return response.data;
  },

  getAdmin: async (id: string): Promise<ApiResponse<Admin>> => {
    const response = await api.get<ApiResponse<Admin>>(`/admins/${id}`);
    return response.data;
  },

  createAdmin: async (data: CreateAdminRequest): Promise<ApiResponse<Admin>> => {
    const response = await api.post<ApiResponse<Admin>>('/admins', data);
    return response.data;
  },

  updateAdmin: async (id: string, data: UpdateAdminRequest): Promise<ApiResponse<Admin>> => {
    const response = await api.put<ApiResponse<Admin>>(`/admins/${id}`, data);
    return response.data;
  },
};
