import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Clock,
  BookOpen,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMyProfile, useStudentHistory } from '@/hooks/useStudents';
import { useBook } from '@/hooks/useBooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  User,
  Building,
  Calendar,
  MapPin,
  BookCopy,
  Loader2,
} from 'lucide-react';
import BookCover from '@/components/BookCover';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { StudentLoan } from '@/services/students';

const BookDetailsModal = ({ bookId, open, onOpenChange }: { bookId: string | null, open: boolean, onOpenChange: (open: boolean) => void }) => {
  const { data: bookResponse, isLoading } = useBook(bookId || '');
  const book = bookResponse?.data;

  if (!bookId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg sm:text-xl pr-4">{isLoading ? 'Loading...' : book?.title}</DialogTitle>
          <DialogDescription>
            View borrowing history details
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : book ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="w-24 h-36 sm:w-32 sm:h-48 bg-muted rounded-lg flex-shrink-0 mx-auto sm:mx-0 relative overflow-hidden shadow-md">
                <BookCover
                  title={book.title}
                  author={book.author}
                  coverImage={book.coverImage}
                  isbn={book.isbn}
                />
              </div>
              <div className="flex-1 space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{book.author}</span>
                </div>
                {book.publisher && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">{book.publisher}</span>
                  </div>
                )}
                {book.publicationYear && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">Published {book.publicationYear}</span>
                  </div>
                )}
                {book.shelfLocation && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">Location: {book.shelfLocation}</span>
                  </div>
                )}
                {book.isbn && (
                  <div className="flex items-center gap-2">
                    <BookCopy className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">ISBN: {book.isbn}</span>
                  </div>
                )}
              </div>
            </div>

            {book.description && (
              <div>
                <h4 className="font-semibold mb-2 text-sm sm:text-base">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{book.description}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Library Availability: </span>
                <Badge variant={(book.availableCopies || 0) > 0 ? "secondary" : "destructive"}>
                  {(book.availableCopies || 0) > 0 ? `${book.availableCopies} Available` : "Out of Stock"}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Book details not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'returned':
      return <Badge className="bg-green-600 hover:bg-green-700">Returned</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const StudentHistory = () => {
  const { data: profileData, isLoading: profileLoading } = useMyProfile();
  const studentId = profileData?.data?.id || '';
  const { data: historyData, isLoading: historyLoading } = useStudentHistory(studentId);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const history = historyData?.data?.filter((loan: StudentLoan) => loan.status === 'returned') || [];
  const isLoading = profileLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Borrowing History
        </h1>
        <p className="text-muted-foreground mt-1">
          All the books you've borrowed and returned
        </p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold mb-1">No borrowing history yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            You haven't returned any books yet. Once you return books, they'll appear here.
          </p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Book</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="hidden sm:table-cell">Borrowed</TableHead>
                <TableHead className="hidden sm:table-cell">Returned</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((loan: StudentLoan) => (
                <TableRow
                  key={loan.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedBookId(loan.bookId)}
                >
                  <TableCell>
                    <div className="h-12 w-8 bg-muted rounded overflow-hidden">
                      <BookCover title={loan.bookTitle} author={loan.bookAuthor} isbn={loan.bookIsbn} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{loan.bookTitle}</p>
                    <p className="text-xs text-muted-foreground">{loan.bookAuthor}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                    {format(parseISO(loan.checkoutDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                    {loan.returnDate ? format(parseISO(loan.returnDate), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">{getStatusBadge(loan.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <BookDetailsModal
        bookId={selectedBookId}
        open={!!selectedBookId}
        onOpenChange={(open) => !open && setSelectedBookId(null)}
      />
    </div>
  );
};

export default StudentHistory;
