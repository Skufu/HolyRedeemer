import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schoolYearService, SchoolYearArchiveRequest, ArchiveGraduatesRequest, UpdatePoliciesRequest } from '@/services/schoolYear';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

export const useYearEndReports = (params?: { start_date?: string; end_date?: string }) => {
  return useQuery({
    queryKey: ['school-year', 'reports', params],
    queryFn: () => schoolYearService.getReports(params),
    enabled: false,
  });
};

export const useExportArchive = () => {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: SchoolYearArchiveRequest) => schoolYearService.exportArchive(payload),
    onSuccess: () => {
      toast({ title: 'Export Ready', description: 'Archive export downloaded successfully.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Export Failed', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
};

export const useArchiveGraduates = () => {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: ArchiveGraduatesRequest) => schoolYearService.archiveGraduates(payload),
    onSuccess: (data) => {
      toast({ title: 'Graduates Archived', description: `${data.data.updated} students archived.` });
    },
    onError: (error: unknown) => {
      toast({ title: 'Archive Failed', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
};

export const useImportStudents = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (file: File) => schoolYearService.importStudents(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: 'Import Completed',
        description: `Imported ${data.data.result.imported} students.`,
      });
    },
    onError: (error: unknown) => {
      toast({ title: 'Import Failed', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
};

export const useResetStudentData = () => {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: { start_date?: string; end_date?: string }) => schoolYearService.resetStudentData(payload),
    onSuccess: () => {
      toast({ title: 'Reset Complete', description: 'Student data reset completed.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Reset Failed', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
};

export const useUpdatePolicies = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: UpdatePoliciesRequest) => schoolYearService.updatePolicies(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Policies Updated', description: 'School year settings updated successfully.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Update Failed', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
};

export const useExportStudents = () => {
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => schoolYearService.exportStudents(),
    onSuccess: () => {
      toast({ title: 'Export Ready', description: 'Students export downloaded.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Export Failed', description: getErrorMessage(error), variant: 'destructive' });
    },
  });
};
