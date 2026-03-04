import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Calendar,
  Clock,
  RotateCcw,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  User,
  Building,
  MapPin,
  BookCopy,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useMyProfile, useStudentLoans } from '@/hooks/useStudents';
import { useRenew } from '@/hooks/useCirculation';
import { useBook } from '@/hooks/useBooks';
import { StudentLoan } from '@/services/students';
import BookCover from '@/components/BookCover';
import { useToast } from '@/hooks/use-toast';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { staggerContainerVariants, staggerItemVariants, fadeInUpVariants } from '@/lib/animations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
            View book details and borrowing status
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

const MyBooks = () => {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const { data: profileData, isLoading: profileLoading } = useMyProfile();
  const studentId = profileData?.data?.id || '';

  const { data: loansData, isLoading: loansLoading, refetch } = useStudentLoans(studentId);
  const renewLoan = useRenew();

  const myLoans = loansData?.data || [];
  const activeLoans = myLoans.filter((t: { status: string }) => t.status === 'borrowed' || t.status === 'overdue');
  const maxBooksPerStudent = 3;
  const availableSlots = Math.max(0, maxBooksPerStudent - activeLoans.length);

  const isLoading = profileLoading || loansLoading;

  const handleRenew = async (loanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await renewLoan.mutateAsync(loanId);
      toast({
        title: 'Success!',
        description: 'Your book has been renewed for 7 more days.',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Renewal Failed',
        description: 'Unable to renew this book. Please see the librarian.',
        variant: 'destructive',
      });
    }
  };

  const getDueStatus = (dueDate: string, status: string) => {
    const daysUntilDue = differenceInDays(new Date(dueDate), new Date());
    const isOverdue = status === 'overdue' || daysUntilDue < 0;
    const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0;

    if (isOverdue) {
      return {
        label: `${Math.abs(daysUntilDue)} days overdue`,
        shortLabel: 'Overdue',
        color: 'text-destructive bg-destructive/10 border-destructive/20',
        icon: AlertCircle,
        urgent: true,
      };
    }

    if (isDueSoon) {
      return {
        label: daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue} days`,
        shortLabel: daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} days`,
        color: 'text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-900/30',
        icon: Clock,
        urgent: true,
      };
    }

    return {
      label: `Due in ${daysUntilDue} days`,
      shortLabel: `${daysUntilDue} days`,
      color: 'text-green-700 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-900/30',
      icon: CheckCircle2,
      urgent: false,
    };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading your books...</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        className="space-y-6"
        initial={prefersReducedMotion ? "visible" : "hidden"}
        animate="visible"
        variants={fadeInUpVariants}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              My Books
            </h1>
            <p className="text-muted-foreground mt-1">
              Books you have borrowed from the library
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1.5 text-sm">
              <BookOpen className="h-4 w-4 mr-2" />
              {activeLoans.length} of {maxBooksPerStudent} borrowed
            </Badge>
            {availableSlots > 0 && (
              <Badge
                variant="default"
                className="px-3 py-1.5 text-sm"
              >
                {availableSlots} slot{availableSlots !== 1 ? 's' : ''} available
              </Badge>
            )}
          </div>
        </div>

        {activeLoans.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-primary/10 p-6 rounded-full mb-6">
                <BookOpen className="h-12 w-12 text-primary/60" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">No books borrowed</h2>
              <p className="text-muted-foreground max-w-md mb-2">
                You have not borrowed any books yet.
              </p>
              <p className="text-muted-foreground max-w-md mb-8">
                You have <span className="font-semibold text-primary">{availableSlots} empty slots</span> available.
                Browse the library catalog to find something interesting to read!
              </p>
              <Button size="lg" asChild>
                <Link to="/student/catalog">
                  <Search className="mr-2 h-5 w-5" />
                  Browse Library Catalog
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-end">
              <span className="text-sm text-muted-foreground">
                {activeLoans.length} book{activeLoans.length !== 1 ? 's' : ''}
              </span>
            </div>

            <motion.div
              className="space-y-3"
              initial={prefersReducedMotion ? "visible" : "hidden"}
              animate="visible"
              variants={staggerContainerVariants}
            >
              {activeLoans.map((loan: StudentLoan) => {
                const status = getDueStatus(loan.dueDate, loan.status);
                const StatusIcon = status.icon;
                const canRenew = (loan.renewCount || 0) < 2 && !status.urgent;

                return (
                  <motion.div
                    key={loan.id}
                    variants={staggerItemVariants}
                  >
                    <Card
                      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedBookId(loan.bookId)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="w-16 h-24 bg-muted rounded-md overflow-hidden shrink-0 shadow-sm">
                            <BookCover
                              title={loan.bookTitle}
                              author={loan.bookAuthor}
                              isbn={loan.bookIsbn}
                              className="w-full h-full"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2">
                                <h3 className="font-semibold text-base line-clamp-1">
                                  {loan.bookTitle}
                                </h3>
                                <Badge className={`${status.color} shrink-0 text-xs w-fit`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.shortLabel}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {loan.bookAuthor}
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 sm:pt-2 gap-3 sm:gap-0">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground w-full sm:w-auto">
                                <span className="flex items-center gap-1.5 shrink-0">
                                  <Calendar className="h-3.5 w-3.5" />
                                  Due {format(new Date(loan.dueDate), 'MMM d')}
                                </span>
                                <span className="flex items-center gap-1.5 shrink-0">
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  {loan.renewCount || 0}/2 renewals
                                </span>
                              </div>

                              {canRenew ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="min-h-[44px] sm:min-h-0 w-full sm:w-auto mt-2 sm:mt-0"
                                  onClick={(e) => handleRenew(loan.id, e)}
                                  disabled={renewLoan.isPending}
                                >
                                  {renewLoan.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                      Renew
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground italic mt-1 sm:mt-0 flex items-center h-[44px] sm:h-auto">
                                  {status.urgent ? 'Return required' : 'Max renewals'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}
      </motion.div>

      <BookDetailsModal
        bookId={selectedBookId}
        open={!!selectedBookId}
        onOpenChange={(open) => !open && setSelectedBookId(null)}
      />
    </>
  );
};

export default MyBooks;
