import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsService, ListRequestsParams, CreateRequestInput } from '@/services/requests';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

export const useRequests = (params?: ListRequestsParams) => {
  return useQuery({
    queryKey: ['requests', params],
    queryFn: () => requestsService.list(params),
  });
};

export const usePendingRequestsCount = () => {
  return useQuery({
    queryKey: ['requests', 'pending-count'],
    queryFn: () => requestsService.getPendingCount(),
  });
};

export const useCreateRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateRequestInput) => requestsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast({ title: 'Success', description: 'Request submitted successfully' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Request Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};

export const useApproveRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => requestsService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast({ title: 'Success', description: 'Request approved' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Approve Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};

export const useRejectRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => requestsService.reject(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast({ title: 'Success', description: 'Request rejected' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Reject Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};
