import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksService, ListBooksParams, Book, CreateBookRequest } from '@/services/books';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/services/api';

export const useBooks = (params?: ListBooksParams) => {
  return useQuery({
    queryKey: ['books', params],
    queryFn: () => booksService.list(params),
    staleTime: 5 * 60 * 1000,
  });
};

export const useBook = (id: string) => {
  return useQuery({
    queryKey: ['book', id],
    queryFn: () => booksService.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useBookCopies = (bookId: string) => {
  return useQuery({
    queryKey: ['book-copies', bookId],
    queryFn: () => booksService.listCopies(bookId),
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateBook = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (book: CreateBookRequest) => booksService.create(book),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: 'Success', description: 'Book created successfully' });
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

export const useUpdateBook = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Book> }) => booksService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: 'Success', description: 'Book updated successfully' });
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

export const useDeleteBook = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => booksService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: 'Success', description: 'Book deleted successfully' });
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

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: booksService.listCategories,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; color_code?: string }) => booksService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Success', description: 'Category created successfully' });
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

export const useRegenerateQRCode = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (qrCode: string) => booksService.regenerateQRCode(qrCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-copies'] });
      toast({ title: 'Success', description: 'QR code regenerated successfully' });
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

export const useBulkRegenerateQRCodes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (bookId: string) => booksService.bulkRegenerateQRCodes(bookId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['book-copies'] });
      toast({ title: 'Success', description: `${data.data?.count} QR codes regenerated` });
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

export const useCopyByQR = (qrCode: string, enabled = true) => {
  return useQuery({
    queryKey: ['copy', 'qr', qrCode],
    queryFn: () => booksService.getCopyByQR(qrCode),
    enabled: enabled && !!qrCode,
    retry: false,
  });
};

export const useCopyByQRMutation = () => {
  return useMutation({
    mutationFn: (qrCode: string) => booksService.getCopyByQR(qrCode),
  });
};
