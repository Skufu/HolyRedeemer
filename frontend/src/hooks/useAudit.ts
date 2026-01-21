import { useQuery } from '@tanstack/react-query';
import { auditService, ListAuditLogsParams } from '@/services/audit';

export const useAuditLogs = (params?: ListAuditLogsParams) => {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditService.list(params),
  });
};

export const useRecentAuditLogs = (limit?: number) => {
  return useQuery({
    queryKey: ['audit-logs', 'recent', limit],
    queryFn: () => auditService.getRecent(limit),
  });
};
