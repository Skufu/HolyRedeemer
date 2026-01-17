import { api, ApiResponse } from './api';

export interface DashboardStats {
  totalBooks: number;
  totalCopies: number;
  activeStudents: number;
  currentLoans: number;
  overdueBooks: number;
  totalFines: number;
  checkoutsToday: number;
  returnsToday: number;
  dueToday: number;
}

export interface CategoryChartData {
  name: string;
  value: number;
  fill?: string;
}

export interface TrendData {
  month: string;
  checkouts: number;
  returns: number;
}

export interface TopBook {
  name: string;
  value: number;
}

export interface RecentActivity {
  id: string;
  type: 'checkout' | 'return' | 'overdue';
  description: string;
  time: string;
}

export const reportsService = {
  getDashboard: async (): Promise<ApiResponse<DashboardStats>> => {
    const response = await api.get<ApiResponse<DashboardStats>>('/reports/dashboard');
    return response.data;
  },

  getCategoriesChart: async (): Promise<ApiResponse<CategoryChartData[]>> => {
    const response = await api.get<ApiResponse<CategoryChartData[]>>('/reports/charts/categories');
    return response.data;
  },

  getTrends: async (months?: number): Promise<ApiResponse<TrendData[]>> => {
    const response = await api.get<ApiResponse<TrendData[]>>('/reports/charts/trends', {
      params: { months },
    });
    return response.data;
  },

  getTopBorrowed: async (limit?: number): Promise<ApiResponse<TopBook[]>> => {
    const response = await api.get<ApiResponse<TopBook[]>>('/reports/charts/top-borrowed', {
      params: { limit },
    });
    return response.data;
  },

  getRecentActivity: async (limit?: number): Promise<ApiResponse<RecentActivity[]>> => {
    const response = await api.get<ApiResponse<RecentActivity[]>>('/reports/activity', {
      params: { limit },
    });
    return response.data;
  },
};
