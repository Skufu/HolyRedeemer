import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService, ListNotificationsParams } from '@/services/notifications';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

// Helper to check if user is authenticated
const isAuthenticated = () => !!localStorage.getItem('lms_access_token');

export const useNotifications = (params?: ListNotificationsParams) => {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsService.list(params),
    enabled: isAuthenticated(),
  });
};

export const useUnreadNotificationsCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.getUnreadCount(),
    refetchInterval: 30000,
    enabled: isAuthenticated(),
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Success', description: 'All notifications marked as read' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};
