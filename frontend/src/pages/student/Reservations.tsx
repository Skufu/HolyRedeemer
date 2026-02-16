import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarClock,
  BookOpen,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMyProfile, useStudentRequests } from '@/hooks/useStudents';
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
            View reservation details
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
    case 'pending':
      return <Badge variant="secondary" className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-yellow-500/20">Pending</Badge>;
    case 'approved':
      return <Badge className="bg-green-600 hover:bg-green-700">Ready for Pickup</Badge>;
    case 'rejected':
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'fulfilled':
      return <Badge variant="outline" className="border-green-600 text-green-600">Fulfilled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const StudentReservations = () => {
  const { data: profileData, isLoading: profileLoading } = useMyProfile();
  const studentId = profileData?.data?.id || '';
  const { data: reservationsData, isLoading: reservationsLoading } = useStudentRequests(studentId, { request_type: 'reservation' });
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  
  const myReservations = reservationsData?.data || [];
  const isLoading = profileLoading || reservationsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          My Reservations
        </h1>
        <p className="text-muted-foreground mt-1">
          Books you've reserved from the library
        </p>
      </div>
      {myReservations.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
          <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-lg font-semibold mb-1">No active reservations</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            You haven't reserved any books yet. Browse the catalog to reserve books that are currently checked out.
          </p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={prefersReducedMotion ? "visible" : "hidden"}
          animate="visible"
          variants={staggerContainerVariants}
        >
          {myReservations.map((reservation) => (
            <motion.div key={reservation.id} variants={staggerItemVariants}>
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow h-full" 
                onClick={() => setSelectedBookId(reservation.bookId)}
              >
                <CardContent className="p-4 flex gap-4 h-full">
                  <div className="w-20 bg-muted rounded overflow-hidden flex-shrink-0 self-start aspect-[2/3]">
                    <BookCover title={reservation.bookTitle} author={reservation.bookAuthor} />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium text-base line-clamp-2">{reservation.bookTitle}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{reservation.bookAuthor}</p>
                    
                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Requested:</span>
                        <span className="text-xs font-medium">{format(parseISO(reservation.requestDate), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        {getStatusBadge(reservation.status)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <BookDetailsModal 
        bookId={selectedBookId} 
        open={!!selectedBookId} 
        onOpenChange={(open) => !open && setSelectedBookId(null)} 
      />
    </div>
  );
};

export default StudentReservations;
