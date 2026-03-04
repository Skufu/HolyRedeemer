import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { circulationService, CheckoutRequest, ReturnRequest, ListLoansParams } from '@/services/circulation';
import { authService } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

export const useCurrentLoans = (params?: ListLoansParams) => {
  return useQuery({
    queryKey: ['loans', 'current', params],
    queryFn: () => circulationService.listCurrentLoans(params),
  });
};

export const useOverdueLoans = (params?: { page?: number; per_page?: number }) => {
  return useQuery({
    queryKey: ['loans', 'overdue', params],
    queryFn: () => circulationService.listOverdue(params),
  });
};

export const useCheckout = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CheckoutRequest) => circulationService.checkout(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book-copies'] });
      queryClient.invalidateQueries({ queryKey: ['student-loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Checkout Successful',
        description: `${response.data.book.title} checked out to ${response.data.student.name}`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Checkout Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};

export const useReturn = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: ReturnRequest) => circulationService.return(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book-copies'] });
      queryClient.invalidateQueries({ queryKey: ['student-loans'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      if (response.data.fine) {
        toast({
          title: 'Book Returned - Fine Generated',
          description: `₱${response.data.fine.amount.toFixed(2)} fine for ${response.data.days_overdue} days overdue`,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Success', description: 'Book returned successfully' });
      }
    },
    onError: (error: unknown) => {
      toast({
        title: 'Return Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};

export const useRenew = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (transactionId: string) => circulationService.renew(transactionId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['student-loans'] });
      toast({
        title: 'Renewed Successfully',
        description: `New due date: ${response.data.new_due_date}`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Renewal Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};

export const useRfidLookup = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (rfidCode: string) => authService.rfidLookup(rfidCode),
    onError: (error: unknown) => {
      toast({
        title: 'Student Not Found',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};
export const useNotifyOverdue = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => circulationService.notifyOverdue(id),
    onSuccess: () => {
      toast({
        title: 'Notification Sent',
        description: 'Overdue reminder has been sent to the student.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to send notification',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};
