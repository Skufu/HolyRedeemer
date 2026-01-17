import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports';

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
