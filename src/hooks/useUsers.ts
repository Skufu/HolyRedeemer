import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  usersService,
  ListLibrariansParams,
  ListAdminsParams,
  CreateLibrarianRequest,
  UpdateLibrarianRequest,
  CreateAdminRequest,
  UpdateAdminRequest,
} from '@/services/users';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

export const useLibrarians = (params?: ListLibrariansParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['librarians', params],
    queryFn: () => usersService.listLibrarians(params),
    ...options,
  });
};

export const useLibrarian = (id: string) => {
  return useQuery({
    queryKey: ['librarian', id],
    queryFn: () => usersService.getLibrarian(id),
    enabled: !!id,
  });
};

export const useCreateLibrarian = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateLibrarianRequest) => usersService.createLibrarian(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['librarians'] });
      toast({ title: 'Success', description: 'Librarian created successfully' });
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

export const useUpdateLibrarian = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLibrarianRequest }) =>
      usersService.updateLibrarian(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['librarians'] });
      queryClient.invalidateQueries({ queryKey: ['librarian', variables.id] });
      toast({ title: 'Success', description: 'Librarian updated successfully' });
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

export const useDeleteLibrarian = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => usersService.deleteLibrarian(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['librarians'] });
      toast({ title: 'Success', description: 'Librarian deleted successfully' });
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

export const useAdmins = (params?: ListAdminsParams, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['admins', params],
    queryFn: () => usersService.listAdmins(params),
    ...options,
  });
};

export const useAdmin = (id: string) => {
  return useQuery({
    queryKey: ['admin', id],
    queryFn: () => usersService.getAdmin(id),
    enabled: !!id,
  });
};

export const useCreateAdmin = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateAdminRequest) => usersService.createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({ title: 'Success', description: 'Admin created successfully' });
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

export const useUpdateAdmin = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminRequest }) =>
      usersService.updateAdmin(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin', variables.id] });
      toast({ title: 'Success', description: 'Admin updated successfully' });
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
