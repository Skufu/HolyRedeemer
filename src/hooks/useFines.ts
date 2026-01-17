import { useMutation, useQueryClient } from '@tanstack/react-query';
import { finesService, PaymentRequest, ListFinesParams } from '@/services/fines';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

export const useFines = (params?: ListFinesParams) => {
  return useQuery({
    queryKey: ['fines', params],
    queryFn: () => finesService.list(params),
  });
};

export const useFine = (id: string) => {
  return useQuery({
    queryKey: ['fine', id],
    queryFn: () => finesService.get(id),
    enabled: !!id,
  });
};

export const usePayFine = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: PaymentRequest }) => finesService.pay(id, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fines'] });
      queryClient.invalidateQueries({ queryKey: ['student-fines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Payment recorded successfully' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Payment Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};

export const useWaiveFine = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => finesService.waive(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fines'] });
      queryClient.invalidateQueries({ queryKey: ['student-fines'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Success', description: 'Fine waived successfully' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Waive Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};
