import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
	studentsService,
	ListStudentsParams,
	CreateStudentRequest,
	Student,
} from '@/services/students';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

export const useMyProfile = () => {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ['student-profile', 'me'],
		queryFn: () => studentsService.getMyProfile(),
		enabled: isAuthenticated,
	});
};

export const useMyDashboard = (params?: {
	loans_per_page?: number;
	fines_per_page?: number;
	history_per_page?: number;
}) => {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ['student-dashboard', params],
		queryFn: () => studentsService.getMyDashboard(params),
		enabled: isAuthenticated,
	});
};

export const useStudents = (params?: ListStudentsParams) => {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => studentsService.list(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudent = (id: string) => {
  return useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsService.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentLoans = (id: string) => {
  return useQuery({
    queryKey: ['student-loans', id],
    queryFn: () => studentsService.getLoans(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useStudentHistory = (id: string, params?: { page?: number; per_page?: number }) => {
  return useQuery({
    queryKey: ['student-history', id, params],
    queryFn: () => studentsService.getHistory(id, params),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useStudentFines = (id: string) => {
  return useQuery({
    queryKey: ['student-fines', id],
    queryFn: () => studentsService.getFines(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useStudentRequests = (
  id: string,
  params?: { page?: number; per_page?: number; status?: string; request_type?: 'reservation' | 'request' }
) => {
  return useQuery({
    queryKey: ['student-requests', id, params],
    queryFn: () => studentsService.getRequests(id, params),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const useReserveBook = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ bookId, notes }: { bookId: string; notes?: string }) =>
      studentsService.reserveBook(bookId, notes),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['student-requests'] });
      queryClient.invalidateQueries({ queryKey: ['student-loans'] });
      queryClient.invalidateQueries({ queryKey: ['student-history'] });
      toast({
        title: 'Success',
        description: 'Book reserved successfully',
      });
      if (variables?.bookId) {
        queryClient.invalidateQueries({ queryKey: ['book', variables.bookId] });
      }
    },
    onError: (error: unknown) => {
      toast({
        title: 'Reservation Failed',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    },
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

export const useFavoriteBooks = () => {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ['student-favorites'],
		queryFn: () => studentsService.getFavorites(),
		enabled: isAuthenticated,
		staleTime: 5 * 60 * 1000,
	});
};

export const useAddFavorite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (bookId: string) => studentsService.addFavorite(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-favorites'] });
      toast({ title: 'Added to Favorites', description: 'Book added to your favorites' });
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

export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (bookId: string) => studentsService.removeFavorite(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-favorites'] });
      toast({ title: 'Removed', description: 'Book removed from favorites' });
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

export const useMyAchievements = () => {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ['student-achievements'],
		queryFn: () => studentsService.getMyAchievements(),
		enabled: isAuthenticated,
		staleTime: 5 * 60 * 1000,
	});
};

export const useAllAchievements = () => {
	const { isAuthenticated } = useAuth();
	return useQuery({
		queryKey: ['all-achievements'],
		queryFn: () => studentsService.getAllAchievements(),
		enabled: isAuthenticated,
		staleTime: 5 * 60 * 1000,
	});
};
