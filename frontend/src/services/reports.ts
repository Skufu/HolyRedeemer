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

export interface GradeLevelData {
  grade_level: number;
  count: number;
}

export interface GradeLevelFines {
  grade_level: number;
  total_amount: number;
}

export interface CategoryUsage {
  grade_level: number;
  category: string;
  borrow_count: number;
}

export interface TopBorrowedByGrade {
  grade_level: number;
  title: string;
  borrow_count: number;
}

export interface DashboardStatsEnhanced extends DashboardStats {
  lostBooks: number;
  damagedBooks: number;
  pendingIncidents: number;
  totalReservations: number;
}

export interface CirculationStatusDist {
  circulation_status: string;
  count: number;
}

export interface DamageLostStats {
  damage_count: number;
  lost_count: number;
  total_cost: number;
}

export interface MonthlyTrendsByYear {
  year: number;
  month: string;
  checkouts: number;
  returns: number;
}

export interface OverviewData {
  stats: {
    totalBooks: number; totalCopies: number; activeStudents: number;
    currentLoans: number; overdueBooks: number; totalFines: number;
    checkoutsToday: number; returnsToday: number; dueToday: number;
    lostBooks: number; damagedBooks: number; pendingIncidents: number;
    totalReservations: number;
  };
  categories: CategoryChartData[];
  topBorrowed: TopBook[];
  trends: TrendData[];
  studentsByGrade: { grade_level: number; count: number }[];
  loansByGrade: { grade_level: number; count: number }[];
  overdueByGrade: { grade_level: number; count: number }[];
  finesByGrade: { grade_level: number; total_amount: number }[];
  circulationStatus: { circulation_status: string; count: number }[];
  damageLostStats: { damage_count: number; lost_count: number; total_cost: number };
}

export interface LoanSummaryItem {
  id: string; bookTitle: string; studentName: string; studentNumber: string;
  dueDate: string; checkoutDate: string; status: string; daysOverdue: number; fineAmount: number;
}

export interface LibrarianDashboardData {
  stats: OverviewData['stats'];
  currentLoans: LoanSummaryItem[];
  overdueLoans: LoanSummaryItem[];
  recentActivity: { id: string; type: string; description: string; time: string }[];
}

export const reportsService = {
  getLibrarianDashboard: async (): Promise<ApiResponse<LibrarianDashboardData>> => {
    const response = await api.get<ApiResponse<LibrarianDashboardData>>('/reports/librarian-dashboard');
    return response.data;
  },
  getOverview: async (): Promise<ApiResponse<OverviewData>> => {
    const response = await api.get<ApiResponse<OverviewData>>('/reports/overview');
    return response.data;
  },
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

  getDashboardEnhanced: async (): Promise<ApiResponse<DashboardStatsEnhanced>> => {
    const response = await api.get<ApiResponse<DashboardStatsEnhanced>>('/reports/dashboard');
    return response.data;
  },

  getStudentsByGradeLevel: async (): Promise<ApiResponse<GradeLevelData[]>> => {
    const response = await api.get<ApiResponse<GradeLevelData[]>>('/reports/charts/students-by-grade');
    return response.data;
  },

  getLoansByGradeLevel: async (): Promise<ApiResponse<GradeLevelData[]>> => {
    const response = await api.get<ApiResponse<GradeLevelData[]>>('/reports/charts/loans-by-grade');
    return response.data;
  },

  getOverdueByGradeLevel: async (): Promise<ApiResponse<GradeLevelData[]>> => {
    const response = await api.get<ApiResponse<GradeLevelData[]>>('/reports/charts/overdue-by-grade');
    return response.data;
  },

  getFinesByGradeLevel: async (): Promise<ApiResponse<GradeLevelFines[]>> => {
    const response = await api.get<ApiResponse<GradeLevelFines[]>>('/reports/charts/fines-by-grade');
    return response.data;
  },

  getCategoryUsageByGradeLevel: async (): Promise<ApiResponse<CategoryUsage[]>> => {
    const response = await api.get<ApiResponse<CategoryUsage[]>>('/reports/charts/category-usage');
    return response.data;
  },

  getTopBorrowedByGradeLevel: async (): Promise<ApiResponse<TopBorrowedByGrade[]>> => {
    const response = await api.get<ApiResponse<TopBorrowedByGrade[]>>('/reports/charts/top-borrowed-by-grade');
    return response.data;
  },

  getCirculationStatusDistribution: async (): Promise<ApiResponse<CirculationStatusDist[]>> => {
    const response = await api.get<ApiResponse<CirculationStatusDist[]>>('/reports/charts/circulation-status');
    return response.data;
  },

  getDamageLostStats: async (): Promise<ApiResponse<DamageLostStats>> => {
    const response = await api.get<ApiResponse<DamageLostStats>>('/reports/charts/damage-lost-stats');
    return response.data;
  },

  getMonthlyTrendsByYear: async (): Promise<ApiResponse<MonthlyTrendsByYear[]>> => {
    const response = await api.get<ApiResponse<MonthlyTrendsByYear[]>>('/reports/charts/trends-by-year');
    return response.data;
  },
};
