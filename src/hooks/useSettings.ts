import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService, UpdateSettingsInput } from '@/services/settings';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

export const useSettings = (category?: string) => {
  return useQuery({
    queryKey: ['settings', category],
    queryFn: () => settingsService.list(category),
  });
};

export const useSetting = (key: string) => {
  return useQuery({
    queryKey: ['setting', key],
    queryFn: () => settingsService.get(key),
    enabled: !!key,
  });
};

export const useBorrowingSettings = () => {
  return useQuery({
    queryKey: ['settings', 'borrowing'],
    queryFn: () => settingsService.getBorrowingSettings(),
  });
};

export const useFineSettings = () => {
  return useQuery({
    queryKey: ['settings', 'fines'],
    queryFn: () => settingsService.getFineSettings(),
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateSettingsInput) => settingsService.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Success', description: 'Settings updated successfully' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Update Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
};
