import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService, ListStudentsParams, CreateStudentRequest, Student } from '@/services/students';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

export const useMyProfile = () => {
  return useQuery({
    queryKey: ['student-profile', 'me'],
    queryFn: () => studentsService.getMyProfile(),
  });
};

export const useStudents = (params?: ListStudentsParams) => {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => studentsService.list(params),
  });
};

export const useStudent = (id: string) => {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsService.get(id),
    enabled: !!id,
  });
};

export const useStudentLoans = (id: string) => {
  return useQuery({
    queryKey: ['student-loans', id],
    queryFn: () => studentsService.getLoans(id),
    enabled: !!id,
  });
};

export const useStudentHistory = (id: string, params?: { page?: number; per_page?: number }) => {
  return useQuery({
    queryKey: ['student-history', id, params],
    queryFn: () => studentsService.getHistory(id, params),
    enabled: !!id,
  });
};

export const useStudentFines = (id: string) => {
  return useQuery({
    queryKey: ['student-fines', id],
    queryFn: () => studentsService.getFines(id),
    enabled: !!id,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (student: CreateStudentRequest) => studentsService.create(student),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({ title: 'Success', description: 'Student created successfully' });
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

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => studentsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['student', variables.id] });
      toast({ title: 'Success', description: 'Student updated successfully' });
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
