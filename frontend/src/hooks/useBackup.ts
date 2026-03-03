import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { backupService } from '@/services/backup';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

export const useBackupList = () => {
  return useQuery({
    queryKey: ['backup', 'list'],
    queryFn: backupService.list,
  });
};

export const useCreateBackup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => backupService.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup', 'list'] });
      toast({ title: 'Backup Created', description: 'Database backup downloaded successfully.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Backup Failed', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
};

export const useDownloadBackup = () => {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (name: string) => backupService.download(name),
    onSuccess: () => {
      toast({ title: 'Download Started', description: 'Backup download started.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Download Failed', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
};
