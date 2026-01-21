import { api, ApiResponse } from './api';

export interface Notification {
  id: string;
  type: 'due_reminder' | 'overdue' | 'fine' | 'request_update' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export interface ListNotificationsParams {
  page?: number;
  per_page?: number;
  is_read?: boolean;
}

export const notificationsService = {
  list: async (params?: ListNotificationsParams): Promise<ApiResponse<Notification[]>> => {
    const response = await api.get<ApiResponse<Notification[]>>('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.put<ApiResponse<null>>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<ApiResponse<null>> => {
    const response = await api.put<ApiResponse<null>>('/notifications/read-all');
    return response.data;
  },
};
