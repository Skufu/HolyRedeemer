import { api, ApiResponse } from './api';

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  username?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface ListAuditLogsParams {
  page?: number;
  per_page?: number;
  user_id?: string;
  action?: string;
  entity_type?: string;
  from_date?: string;
  to_date?: string;
}

export const auditService = {
  list: async (params?: ListAuditLogsParams): Promise<ApiResponse<AuditLog[]>> => {
    const response = await api.get<ApiResponse<AuditLog[]>>('/audit-logs', { params });
    return response.data;
  },

  getRecent: async (limit?: number): Promise<ApiResponse<AuditLog[]>> => {
    const response = await api.get<ApiResponse<AuditLog[]>>('/audit-logs/recent', { params: { limit } });
    return response.data;
  },
};
