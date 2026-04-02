import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports';

export const useLibrarianDashboard = () => {
  return useQuery({
    queryKey: ['librarian-dashboard'],
    queryFn: () => reportsService.getLibrarianDashboard(),
    refetchInterval: 60000,
  });
};

export const useOverview = () => {
  return useQuery({
    queryKey: ['reports-overview'],
    queryFn: () => reportsService.getOverview(),
    refetchInterval: 60000,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: reportsService.getDashboard,
    refetchInterval: 60000,
  });
};

export const useCategoriesChart = () => {
  return useQuery({
    queryKey: ['dashboard', 'categories'],
    queryFn: reportsService.getCategoriesChart,
    staleTime: 5 * 60 * 1000,
  });
};

export const useMonthlyTrends = (months?: number) => {
  return useQuery({
    queryKey: ['dashboard', 'trends', months],
    queryFn: () => reportsService.getTrends(months),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTopBorrowed = (limit = 5) => {
  return useQuery({
    queryKey: ['dashboard', 'top-borrowed', limit],
    queryFn: () => reportsService.getTopBorrowed(limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useRecentActivity = (limit = 10) => {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: () => reportsService.getRecentActivity(limit),
    refetchInterval: 30000,
  });
};

export const useDashboardEnhanced = () => {
  return useQuery({
    queryKey: ['dashboard', 'enhanced'],
    queryFn: reportsService.getDashboardEnhanced,
    refetchInterval: 60000,
  });
};

export const useStudentsByGradeLevel = () => {
  return useQuery({
    queryKey: ['dashboard', 'students-by-grade'],
    queryFn: reportsService.getStudentsByGradeLevel,
    staleTime: 5 * 60 * 1000,
  });
};

export const useLoansByGradeLevel = () => {
  return useQuery({
    queryKey: ['dashboard', 'loans-by-grade'],
    queryFn: reportsService.getLoansByGradeLevel,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOverdueByGradeLevel = () => {
  return useQuery({
    queryKey: ['dashboard', 'overdue-by-grade'],
    queryFn: reportsService.getOverdueByGradeLevel,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFinesByGradeLevel = () => {
  return useQuery({
    queryKey: ['dashboard', 'fines-by-grade'],
    queryFn: reportsService.getFinesByGradeLevel,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCategoryUsageByGradeLevel = () => {
  return useQuery({
    queryKey: ['dashboard', 'category-usage'],
    queryFn: reportsService.getCategoryUsageByGradeLevel,
    staleTime: 5 * 60 * 1000,
  });
};

export const useTopBorrowedByGradeLevel = () => {
  return useQuery({
    queryKey: ['dashboard', 'top-borrowed-by-grade'],
    queryFn: reportsService.getTopBorrowedByGradeLevel,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCirculationStatusDistribution = () => {
  return useQuery({
    queryKey: ['dashboard', 'circulation-status'],
    queryFn: reportsService.getCirculationStatusDistribution,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDamageLostStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'damage-lost-stats'],
    queryFn: reportsService.getDamageLostStats,
    staleTime: 5 * 60 * 1000,
  });
};

export const useMonthlyTrendsByYear = () => {
  return useQuery({
    queryKey: ['dashboard', 'trends-by-year'],
    queryFn: reportsService.getMonthlyTrendsByYear,
    staleTime: 5 * 60 * 1000,
  });
};
